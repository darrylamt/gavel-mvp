-- Seed: Phone models for Swap feature
-- Apple iPhones, Samsung S / Fold / Flip series, Google Pixel

-- ─── APPLE ───────────────────────────────────────────────────────────────────

-- iPhone 16 Series
INSERT INTO swap_phone_models (brand, model, release_year, back_material, rear_cameras, biometric, water_resistance_rating, base_trade_in_value) VALUES
('Apple', 'iPhone 16',        2024, 'glass',   '["Main", "Ultra Wide"]',                         'faceID', 'IP68', 2800),
('Apple', 'iPhone 16 Plus',   2024, 'glass',   '["Main", "Ultra Wide"]',                         'faceID', 'IP68', 3100),
('Apple', 'iPhone 16 Pro',    2024, 'glass',   '["Main", "Ultra Wide", "Telephoto"]',            'faceID', 'IP68', 4200),
('Apple', 'iPhone 16 Pro Max',2024, 'glass',   '["Main", "Ultra Wide", "Telephoto"]',            'faceID', 'IP68', 4800);

-- iPhone 15 Series
INSERT INTO swap_phone_models (brand, model, release_year, back_material, rear_cameras, biometric, water_resistance_rating, base_trade_in_value) VALUES
('Apple', 'iPhone 15',        2023, 'glass',   '["Main", "Ultra Wide"]',                         'faceID', 'IP68', 2200),
('Apple', 'iPhone 15 Plus',   2023, 'glass',   '["Main", "Ultra Wide"]',                         'faceID', 'IP68', 2500),
('Apple', 'iPhone 15 Pro',    2023, 'glass',   '["Main", "Ultra Wide", "Telephoto"]',            'faceID', 'IP68', 3300),
('Apple', 'iPhone 15 Pro Max',2023, 'glass',   '["Main", "Ultra Wide", "Telephoto"]',            'faceID', 'IP68', 3800);

-- iPhone 14 Series
INSERT INTO swap_phone_models (brand, model, release_year, back_material, rear_cameras, biometric, water_resistance_rating, base_trade_in_value) VALUES
('Apple', 'iPhone 14',        2022, 'glass',   '["Main", "Ultra Wide"]',                         'faceID', 'IP68', 1600),
('Apple', 'iPhone 14 Plus',   2022, 'glass',   '["Main", "Ultra Wide"]',                         'faceID', 'IP68', 1800),
('Apple', 'iPhone 14 Pro',    2022, 'glass',   '["Main", "Ultra Wide", "Telephoto"]',            'faceID', 'IP68', 2400),
('Apple', 'iPhone 14 Pro Max',2022, 'glass',   '["Main", "Ultra Wide", "Telephoto"]',            'faceID', 'IP68', 2700);

-- iPhone 13 Series
INSERT INTO swap_phone_models (brand, model, release_year, back_material, rear_cameras, biometric, water_resistance_rating, base_trade_in_value) VALUES
('Apple', 'iPhone 13',        2021, 'glass',   '["Main", "Ultra Wide"]',                         'faceID', 'IP68', 1100),
('Apple', 'iPhone 13 mini',   2021, 'glass',   '["Main", "Ultra Wide"]',                         'faceID', 'IP68', 900),
('Apple', 'iPhone 13 Pro',    2021, 'glass',   '["Main", "Ultra Wide", "Telephoto"]',            'faceID', 'IP68', 1500),
('Apple', 'iPhone 13 Pro Max',2021, 'glass',   '["Main", "Ultra Wide", "Telephoto"]',            'faceID', 'IP68', 1700);

-- iPhone 12 Series
INSERT INTO swap_phone_models (brand, model, release_year, back_material, rear_cameras, biometric, water_resistance_rating, base_trade_in_value) VALUES
('Apple', 'iPhone 12',        2020, 'glass',   '["Main", "Ultra Wide"]',                         'faceID', 'IP68', 700),
('Apple', 'iPhone 12 mini',   2020, 'glass',   '["Main", "Ultra Wide"]',                         'faceID', 'IP68', 600),
('Apple', 'iPhone 12 Pro',    2020, 'glass',   '["Main", "Ultra Wide", "Telephoto"]',            'faceID', 'IP68', 900),
('Apple', 'iPhone 12 Pro Max',2020, 'glass',   '["Main", "Ultra Wide", "Telephoto"]',            'faceID', 'IP68', 1000);

-- iPhone 11 Series
INSERT INTO swap_phone_models (brand, model, release_year, back_material, rear_cameras, biometric, water_resistance_rating, base_trade_in_value) VALUES
('Apple', 'iPhone 11',        2019, 'glass',   '["Main", "Ultra Wide"]',                         'faceID', 'IP68', 500),
('Apple', 'iPhone 11 Pro',    2019, 'glass',   '["Main", "Ultra Wide", "Telephoto"]',            'faceID', 'IP68', 650),
('Apple', 'iPhone 11 Pro Max',2019, 'glass',   '["Main", "Ultra Wide", "Telephoto"]',            'faceID', 'IP68', 700);

-- iPhone SE
INSERT INTO swap_phone_models (brand, model, release_year, back_material, rear_cameras, biometric, water_resistance_rating, base_trade_in_value) VALUES
('Apple', 'iPhone SE (2022)', 2022, 'glass',   '["Main"]',                                       'fingerprint', 'IP67', 600),
('Apple', 'iPhone SE (2020)', 2020, 'glass',   '["Main"]',                                       'fingerprint', 'IP67', 350);


-- ─── SAMSUNG S SERIES ────────────────────────────────────────────────────────

-- S25 Series
INSERT INTO swap_phone_models (brand, model, release_year, back_material, rear_cameras, biometric, water_resistance_rating, base_trade_in_value) VALUES
('Samsung', 'Galaxy S25',        2025, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',          'fingerprint', 'IP68', 2900),
('Samsung', 'Galaxy S25+',       2025, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',          'fingerprint', 'IP68', 3400),
('Samsung', 'Galaxy S25 Ultra',  2025, 'glass', '["Wide", "Ultra Wide", "Telephoto 3x", "Telephoto 5x"]', 'fingerprint', 'IP68', 4600);

-- S24 Series
INSERT INTO swap_phone_models (brand, model, release_year, back_material, rear_cameras, biometric, water_resistance_rating, base_trade_in_value) VALUES
('Samsung', 'Galaxy S24',        2024, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',          'fingerprint', 'IP68', 2200),
('Samsung', 'Galaxy S24+',       2024, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',          'fingerprint', 'IP68', 2700),
('Samsung', 'Galaxy S24 Ultra',  2024, 'glass', '["Wide", "Ultra Wide", "Telephoto 3x", "Telephoto 5x"]', 'fingerprint', 'IP68', 3800),
('Samsung', 'Galaxy S24 FE',     2024, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',          'fingerprint', 'IP68', 1600);

-- S23 Series
INSERT INTO swap_phone_models (brand, model, release_year, back_material, rear_cameras, biometric, water_resistance_rating, base_trade_in_value) VALUES
('Samsung', 'Galaxy S23',        2023, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',          'fingerprint', 'IP68', 1500),
('Samsung', 'Galaxy S23+',       2023, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',          'fingerprint', 'IP68', 1800),
('Samsung', 'Galaxy S23 Ultra',  2023, 'glass', '["Wide", "Ultra Wide", "Telephoto 3x", "Telephoto 10x"]', 'fingerprint', 'IP68', 2500),
('Samsung', 'Galaxy S23 FE',     2023, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',          'fingerprint', 'IP68', 1100);

-- S22 Series
INSERT INTO swap_phone_models (brand, model, release_year, back_material, rear_cameras, biometric, water_resistance_rating, base_trade_in_value) VALUES
('Samsung', 'Galaxy S22',        2022, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',          'fingerprint', 'IP68', 1000),
('Samsung', 'Galaxy S22+',       2022, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',          'fingerprint', 'IP68', 1200),
('Samsung', 'Galaxy S22 Ultra',  2022, 'glass', '["Wide", "Ultra Wide", "Telephoto 3x", "Telephoto 10x"]', 'fingerprint', 'IP68', 1600);

-- S21 Series
INSERT INTO swap_phone_models (brand, model, release_year, back_material, rear_cameras, biometric, water_resistance_rating, base_trade_in_value) VALUES
('Samsung', 'Galaxy S21',        2021, 'plastic', '["Wide", "Ultra Wide", "Telephoto"]',        'fingerprint', 'IP68', 700),
('Samsung', 'Galaxy S21+',       2021, 'glass',   '["Wide", "Ultra Wide", "Telephoto"]',        'fingerprint', 'IP68', 850),
('Samsung', 'Galaxy S21 Ultra',  2021, 'glass',   '["Wide", "Ultra Wide", "Telephoto 3x", "Telephoto 10x"]', 'fingerprint', 'IP68', 1100),
('Samsung', 'Galaxy S21 FE',     2022, 'plastic', '["Wide", "Ultra Wide", "Telephoto"]',        'fingerprint', 'IP68', 600);

-- S20 Series
INSERT INTO swap_phone_models (brand, model, release_year, back_material, rear_cameras, biometric, water_resistance_rating, base_trade_in_value) VALUES
('Samsung', 'Galaxy S20',        2020, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',          'fingerprint', 'IP68', 500),
('Samsung', 'Galaxy S20+',       2020, 'glass', '["Wide", "Ultra Wide", "Telephoto", "ToF"]',   'fingerprint', 'IP68', 600),
('Samsung', 'Galaxy S20 Ultra',  2020, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',          'fingerprint', 'IP68', 700),
('Samsung', 'Galaxy S20 FE',     2020, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',          'fingerprint', 'IP67', 400);


-- ─── SAMSUNG Z FOLD SERIES ───────────────────────────────────────────────────

INSERT INTO swap_phone_models (brand, model, release_year, back_material, rear_cameras, biometric, water_resistance_rating, base_trade_in_value) VALUES
('Samsung', 'Galaxy Z Fold 6',   2024, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',          'fingerprint', 'IPX8', 5500),
('Samsung', 'Galaxy Z Fold 5',   2023, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',          'fingerprint', 'IPX8', 4000),
('Samsung', 'Galaxy Z Fold 4',   2022, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',          'fingerprint', 'IPX8', 2800),
('Samsung', 'Galaxy Z Fold 3',   2021, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',          'fingerprint', 'IPX8', 1800),
('Samsung', 'Galaxy Z Fold 2',   2020, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',          'fingerprint', NULL,   1100);


-- ─── SAMSUNG Z FLIP SERIES ───────────────────────────────────────────────────

INSERT INTO swap_phone_models (brand, model, release_year, back_material, rear_cameras, biometric, water_resistance_rating, base_trade_in_value) VALUES
('Samsung', 'Galaxy Z Flip 6',   2024, 'glass', '["Wide", "Ultra Wide"]',                       'fingerprint', 'IP48', 3000),
('Samsung', 'Galaxy Z Flip 5',   2023, 'glass', '["Wide", "Ultra Wide"]',                       'fingerprint', 'IPX8', 2200),
('Samsung', 'Galaxy Z Flip 4',   2022, 'glass', '["Wide", "Ultra Wide"]',                       'fingerprint', 'IPX8', 1500),
('Samsung', 'Galaxy Z Flip 3',   2021, 'glass', '["Wide", "Ultra Wide"]',                       'fingerprint', 'IPX8', 900),
('Samsung', 'Galaxy Z Flip',     2020, 'glass', '["Wide", "Ultra Wide"]',                       'fingerprint', NULL,   500);


-- ─── GOOGLE PIXEL ────────────────────────────────────────────────────────────

-- Pixel 9 Series
INSERT INTO swap_phone_models (brand, model, release_year, back_material, rear_cameras, biometric, water_resistance_rating, base_trade_in_value) VALUES
('Google', 'Pixel 9',          2024, 'glass', '["Wide", "Ultra Wide"]',                         'fingerprint', 'IP68', 2400),
('Google', 'Pixel 9 Pro',      2024, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',            'fingerprint', 'IP68', 3200),
('Google', 'Pixel 9 Pro XL',   2024, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',            'fingerprint', 'IP68', 3600),
('Google', 'Pixel 9 Pro Fold', 2024, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',            'fingerprint', 'IP68', 5200);

-- Pixel 8 Series
INSERT INTO swap_phone_models (brand, model, release_year, back_material, rear_cameras, biometric, water_resistance_rating, base_trade_in_value) VALUES
('Google', 'Pixel 8',          2023, 'glass', '["Wide", "Ultra Wide"]',                         'fingerprint', 'IP68', 1700),
('Google', 'Pixel 8 Pro',      2023, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',            'fingerprint', 'IP68', 2300),
('Google', 'Pixel 8a',         2024, 'plastic','["Wide", "Ultra Wide"]',                        'fingerprint', 'IP67', 1400);

-- Pixel 7 Series
INSERT INTO swap_phone_models (brand, model, release_year, back_material, rear_cameras, biometric, water_resistance_rating, base_trade_in_value) VALUES
('Google', 'Pixel 7',          2022, 'glass', '["Wide", "Ultra Wide"]',                         'fingerprint', 'IP68', 1100),
('Google', 'Pixel 7 Pro',      2022, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',            'fingerprint', 'IP68', 1500),
('Google', 'Pixel 7a',         2023, 'plastic','["Wide", "Ultra Wide"]',                        'fingerprint', 'IP67', 900);

-- Pixel 6 Series
INSERT INTO swap_phone_models (brand, model, release_year, back_material, rear_cameras, biometric, water_resistance_rating, base_trade_in_value) VALUES
('Google', 'Pixel 6',          2021, 'glass', '["Wide", "Ultra Wide"]',                         'fingerprint', 'IP68', 700),
('Google', 'Pixel 6 Pro',      2021, 'glass', '["Wide", "Ultra Wide", "Telephoto"]',            'fingerprint', 'IP68', 900),
('Google', 'Pixel 6a',         2022, 'plastic','["Wide", "Ultra Wide"]',                        'fingerprint', 'IP67', 550);

-- Pixel 5 / 4a
INSERT INTO swap_phone_models (brand, model, release_year, back_material, rear_cameras, biometric, water_resistance_rating, base_trade_in_value) VALUES
('Google', 'Pixel 5',          2020, 'metal',  '["Wide", "Ultra Wide"]',                        'fingerprint', 'IP68', 450),
('Google', 'Pixel 4a',         2020, 'plastic', '["Wide"]',                                     'fingerprint', NULL,   300),
('Google', 'Pixel 4a 5G',      2020, 'plastic', '["Wide", "Ultra Wide"]',                       'fingerprint', NULL,   350);


-- ─── DEFAULT DEDUCTION RATES ─────────────────────────────────────────────────
-- Insert a default blank rate row for every model that doesn't have one yet.

INSERT INTO swap_deduction_rates (
  model_id,
  screen_replacement_cost,
  screen_replaced_fixed_deduction,
  back_glass_replacement_cost,
  back_glass_replaced_fixed_deduction,
  battery_deduction_per_percent,
  battery_replaced_fixed_deduction,
  camera_glass_cracked_deduction,
  front_camera_deduction,
  rear_camera_deduction_per_camera,
  face_id_deduction,
  fingerprint_deduction,
  minor_scratches_deduction,
  dents_deduction
)
SELECT
  id,
  ROUND(base_trade_in_value * 0.15),
  ROUND(base_trade_in_value * 0.05),
  ROUND(base_trade_in_value * 0.10),
  ROUND(base_trade_in_value * 0.03),
  ROUND(base_trade_in_value * 0.008),
  ROUND(base_trade_in_value * 0.04),
  ROUND(base_trade_in_value * 0.04),
  ROUND(base_trade_in_value * 0.05),
  ROUND(base_trade_in_value * 0.04),
  ROUND(base_trade_in_value * 0.08),
  ROUND(base_trade_in_value * 0.06),
  ROUND(base_trade_in_value * 0.02),
  ROUND(base_trade_in_value * 0.05)
FROM swap_phone_models
WHERE id NOT IN (SELECT model_id FROM swap_deduction_rates WHERE model_id IS NOT NULL);
