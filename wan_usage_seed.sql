-- First, ensure the WANs exist in the database
INSERT INTO "Wan" (id, "createdAt", "updatedAt", "wanName", "wanStatus", "prepaidUsageMode", dhcp, "usageBlocked", "usageInBytes", "usageLimitStatus", "maxBytes")
VALUES 
  ('979FC0CE166A11EDA4F51737CD617E52', NOW(), NOW(), 'STARLINK', 'ONLINE', 'ALLOW', 'ENABLED', 0, 0, 'LIMIT_ENFORCED', 107374182400),
  ('FCF62321165611EDA56E193DE7CF5745', NOW(), NOW(), 'VSAT', 'ONLINE', 'ALLOW', 'ENABLED', 0, 0, 'NO_LIMIT', 0),
  ('FCF76E57165611EDA56E193DE7CF5745', NOW(), NOW(), 'IRIDIUM', 'ONLINE', 'ALLOW', 'ENABLED', 0, 0, 'NO_LIMIT', 0),
  ('FCF87D17165611EDA56E193DE7CF5745', NOW(), NOW(), 'Mobile', 'ONLINE', 'ALLOW', 'ENABLED', 0, 0, 'NO_LIMIT', 0)
ON CONFLICT (id) DO UPDATE SET "wanName" = EXCLUDED."wanName";

-- Now create the WAN usage data for about 2 months (60 days)
-- We'll use a more efficient approach with batch inserts

DO $$
DECLARE
    -- Reduce the date range to 30 days for faster execution
    start_date DATE := CURRENT_DATE - INTERVAL '30 days';
    current_date DATE := start_date;
    end_date DATE := CURRENT_DATE;
    
    -- WAN IDs from your example
    starlink_id VARCHAR := '979FC0CE166A11EDA4F51737CD617E52';
    vsat_id VARCHAR := 'FCF62321165611EDA56E193DE7CF5745';
    iridium_id VARCHAR := 'FCF76E57165611EDA56E193DE7CF5745';
    mobile_id VARCHAR := 'FCF87D17165611EDA56E193DE7CF5745';
    
    -- Starting byte counts for each WAN
    starlink_bytes BIGINT := 100000000;  -- Starting with 100MB
    vsat_bytes BIGINT := 50000000;       -- Starting with 50MB
    iridium_bytes BIGINT := 10000000;    -- Starting with 10MB
    mobile_bytes BIGINT := 5000000;      -- Starting with 5MB
    
    -- Daily increase patterns (in bytes) - simplified for speed
    starlink_daily_min BIGINT := 5000000;   -- 5MB min increase per day
    starlink_daily_max BIGINT := 20000000;  -- 20MB max increase per day
    
    vsat_daily_min BIGINT := 2000000;       -- 2MB min increase per day
    vsat_daily_max BIGINT := 10000000;      -- 10MB max increase per day
    
    iridium_daily_min BIGINT := 0;          -- 0MB min increase per day (sometimes no usage)
    iridium_daily_max BIGINT := 2000000;    -- 2MB max increase per day
    
    mobile_daily_min BIGINT := 0;           -- 0MB min increase per day (sometimes no usage)
    mobile_daily_max BIGINT := 5000000;     -- 5MB max increase per day
    
    -- Variables for random increases
    starlink_increase BIGINT;
    vsat_increase BIGINT;
    iridium_increase BIGINT;
    mobile_increase BIGINT;
    
    -- ID generation
    record_id VARCHAR;
    timestamp_suffix VARCHAR;
    
    -- Progress tracking
    total_days INT;
    current_day INT := 0;
    progress INT;
    
    -- Safety counter to prevent infinite loops
    safety_counter INT := 0;
    max_iterations INT := 366; -- Maximum days in a year plus some buffer
BEGIN
    -- Calculate total days for progress tracking
    total_days := (end_date - start_date);
    
    -- Generate a timestamp suffix to make IDs unique across runs
    timestamp_suffix := to_char(NOW(), 'HHMI');
    
    -- First, delete any existing seed data to avoid conflicts
    DELETE FROM "WanUsage" WHERE id LIKE 'seed_%_' || timestamp_suffix;
    
    RAISE NOTICE 'Generating WAN usage data for % days...', total_days;
    
    -- Loop through each day
    WHILE current_date <= end_date AND safety_counter < max_iterations LOOP
        safety_counter := safety_counter + 1;
        current_day := current_day + 1;
        
        -- Show progress every 5 days
        IF current_day % 5 = 0 THEN
            progress := (current_day * 100) / total_days;
            RAISE NOTICE 'Progress: %%% (Day % of %)', progress, current_day, total_days;
        END IF;
        
        -- Calculate random daily increases - simplified for speed
        starlink_increase := floor(random() * (starlink_daily_max - starlink_daily_min) + starlink_daily_min);
        vsat_increase := floor(random() * (vsat_daily_max - vsat_daily_min) + vsat_daily_min);
        iridium_increase := floor(random() * iridium_daily_max);  -- Sometimes zero
        mobile_increase := floor(random() * mobile_daily_max);    -- Sometimes zero
        
        -- Add the increases to the running totals
        starlink_bytes := starlink_bytes + starlink_increase;
        vsat_bytes := vsat_bytes + vsat_increase;
        iridium_bytes := iridium_bytes + iridium_increase;
        mobile_bytes := mobile_bytes + mobile_increase;
        
        -- Generate unique IDs for each record (using a simple pattern for demo)
        record_id := 'seed_' || starlink_id || '_' || to_char(current_date, 'YYYYMMDD') || '_' || timestamp_suffix;
        
        -- Insert STARLINK record for this day
        INSERT INTO "WanUsage" (
            id, "wanId", bytes, "startTime", "endTime", "maxBytes", 
            "snapshotDate", "createdAt", "updatedAt"
        ) VALUES (
            record_id,
            starlink_id,
            starlink_bytes,
            start_date, -- All records start from the same initial date
            current_date::timestamp + interval '23 hours 59 minutes',
            107374182400, -- 100GB max
            current_date::timestamp + interval '12 hours', -- snapshot at noon
            current_date::timestamp + interval '12 hours', -- created at noon
            current_date::timestamp + interval '12 hours'  -- updated at noon
        ) ON CONFLICT (id) DO UPDATE SET 
            bytes = starlink_bytes,
            "updatedAt" = NOW();
        
        -- Insert VSAT record for this day
        record_id := 'seed_' || vsat_id || '_' || to_char(current_date, 'YYYYMMDD') || '_' || timestamp_suffix;
        INSERT INTO "WanUsage" (
            id, "wanId", bytes, "startTime", "endTime", "maxBytes", 
            "snapshotDate", "createdAt", "updatedAt"
        ) VALUES (
            record_id,
            vsat_id,
            vsat_bytes,
            start_date,
            current_date::timestamp + interval '23 hours 59 minutes',
            0, -- No max bytes
            current_date::timestamp + interval '12 hours',
            current_date::timestamp + interval '12 hours',
            current_date::timestamp + interval '12 hours'
        ) ON CONFLICT (id) DO UPDATE SET 
            bytes = vsat_bytes,
            "updatedAt" = NOW();
        
        -- Insert IRIDIUM record for this day
        record_id := 'seed_' || iridium_id || '_' || to_char(current_date, 'YYYYMMDD') || '_' || timestamp_suffix;
        INSERT INTO "WanUsage" (
            id, "wanId", bytes, "startTime", "endTime", "maxBytes", 
            "snapshotDate", "createdAt", "updatedAt"
        ) VALUES (
            record_id,
            iridium_id,
            iridium_bytes,
            start_date,
            current_date::timestamp + interval '23 hours 59 minutes',
            0, -- No max bytes
            current_date::timestamp + interval '12 hours',
            current_date::timestamp + interval '12 hours',
            current_date::timestamp + interval '12 hours'
        ) ON CONFLICT (id) DO UPDATE SET 
            bytes = iridium_bytes,
            "updatedAt" = NOW();
        
        -- Insert Mobile record for this day
        record_id := 'seed_' || mobile_id || '_' || to_char(current_date, 'YYYYMMDD') || '_' || timestamp_suffix;
        INSERT INTO "WanUsage" (
            id, "wanId", bytes, "startTime", "endTime", "maxBytes", 
            "snapshotDate", "createdAt", "updatedAt"
        ) VALUES (
            record_id,
            mobile_id,
            mobile_bytes,
            start_date,
            current_date::timestamp + interval '23 hours 59 minutes',
            0, -- No max bytes
            current_date::timestamp + interval '12 hours',
            current_date::timestamp + interval '12 hours',
            current_date::timestamp + interval '12 hours'
        ) ON CONFLICT (id) DO UPDATE SET 
            bytes = mobile_bytes,
            "updatedAt" = NOW();
        
        -- Move to the next day
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
    
    -- Check if we hit the safety limit
    IF safety_counter >= max_iterations THEN
        RAISE NOTICE 'WARNING: Reached maximum iteration count (%); loop may have been infinite', max_iterations;
    ELSE
        RAISE NOTICE 'Successfully generated data for % days', current_day - 1;
    END IF;
    
    RAISE NOTICE 'Adding usage patterns...';
    
    -- Add some usage patterns - make some days have higher usage for STARLINK
    -- For example, weekends might have higher usage
    UPDATE "WanUsage" 
    SET bytes = bytes * 1.5 
    WHERE id LIKE 'seed_' || starlink_id || '_%_' || timestamp_suffix
    AND EXTRACT(DOW FROM "snapshotDate") IN (0, 6); -- 0 is Sunday, 6 is Saturday
    
    -- Add some zero usage days for IRIDIUM and Mobile (simulating disconnection)
    -- Use a more efficient approach
    UPDATE "WanUsage"
    SET bytes = 0
    WHERE (id LIKE 'seed_' || iridium_id || '_%_' || timestamp_suffix OR 
           id LIKE 'seed_' || mobile_id || '_%_' || timestamp_suffix)
    AND random() < 0.3; -- 30% chance of zero usage
    
    RAISE NOTICE 'WAN usage seed data generation complete!';
END $$;

-- Add a few special data points to test edge cases
-- Add a record with NULL endTime (in progress)
INSERT INTO "WanUsage" (
    id, "wanId", bytes, "startTime", "endTime", "maxBytes", 
    "snapshotDate", "createdAt", "updatedAt"
) VALUES (
    'special_in_progress_' || to_char(NOW(), 'YYYYMMDD_HHMI'),
    '979FC0CE166A11EDA4F51737CD617E52', -- STARLINK
    300000000, -- 300MB
    CURRENT_DATE - INTERVAL '1 day',
    NULL, -- NULL endTime
    107374182400,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET bytes = 300000000;

-- Add a record with a very large byte count (spike)
INSERT INTO "WanUsage" (
    id, "wanId", bytes, "startTime", "endTime", "maxBytes", 
    "snapshotDate", "createdAt", "updatedAt"
) VALUES (
    'special_spike_' || to_char(NOW(), 'YYYYMMDD_HHMI'),
    'FCF62321165611EDA56E193DE7CF5745', -- VSAT
    1073741824, -- 1GB (spike)
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE - INTERVAL '3 days' + INTERVAL '23 hours 59 minutes',
    0,
    CURRENT_DATE - INTERVAL '3 days' + INTERVAL '12 hours',
    CURRENT_DATE - INTERVAL '3 days' + INTERVAL '12 hours',
    CURRENT_DATE - INTERVAL '3 days' + INTERVAL '12 hours'
) ON CONFLICT (id) DO UPDATE SET bytes = 1073741824;

-- Add a record with zero bytes (no usage)
INSERT INTO "WanUsage" (
    id, "wanId", bytes, "startTime", "endTime", "maxBytes", 
    "snapshotDate", "createdAt", "updatedAt"
) VALUES (
    'special_zero_' || to_char(NOW(), 'YYYYMMDD_HHMI'),
    'FCF76E57165611EDA56E193DE7CF5745', -- IRIDIUM
    0, -- Zero bytes
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE - INTERVAL '5 days' + INTERVAL '23 hours 59 minutes',
    0,
    CURRENT_DATE - INTERVAL '5 days' + INTERVAL '12 hours',
    CURRENT_DATE - INTERVAL '5 days' + INTERVAL '12 hours',
    CURRENT_DATE - INTERVAL '5 days' + INTERVAL '12 hours'
) ON CONFLICT (id) DO UPDATE SET bytes = 0;

SELECT COUNT(*) as total_records_created FROM "WanUsage" WHERE id LIKE 'seed_%' OR id LIKE 'special_%'; 