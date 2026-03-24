-- Deduplication: remove duplicate swap phone models and their rates
-- Keeps the earliest inserted row (MIN id) for each brand+model+release_year combination.

-- Step 1: delete duplicate deduction_rates first (FK constraint)
DELETE FROM swap_deduction_rates
WHERE id NOT IN (
  SELECT DISTINCT ON (model_id) id
  FROM swap_deduction_rates
  ORDER BY model_id, id
);

-- Step 2: delete duplicate phone models (keep MIN id per brand+model+release_year)
DELETE FROM swap_phone_models
WHERE id NOT IN (
  SELECT DISTINCT ON (brand, model, release_year) id
  FROM swap_phone_models
  ORDER BY brand, model, release_year, id
);
