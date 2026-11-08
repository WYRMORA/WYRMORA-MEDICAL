ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_asset_id UUID REFERENCES private_assets(id) ON DELETE SET NULL;
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS credential_asset_id UUID REFERENCES private_assets(id) ON DELETE SET NULL;
ALTER TABLE pharmacist_profiles
  ADD COLUMN IF NOT EXISTS credential_asset_id UUID REFERENCES private_assets(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS products_image_asset_idx ON products(image_asset_id);
