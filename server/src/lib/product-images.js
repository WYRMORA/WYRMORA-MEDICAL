export async function createProductImageDownloadUrl({
  productId,
  includeTestProducts,
  query,
  signDownloadUrl
}) {
  const result = await query(
    `SELECT asset.object_key
     FROM products p
     JOIN sellers s ON s.user_id=p.seller_id AND s.verification_status='verified'
     JOIN private_assets asset
       ON asset.id=p.image_asset_id
      AND asset.purpose='product_image'
      AND asset.status='uploaded'
     WHERE p.id=$1
       AND p.status='approved'
       AND p.is_active=true
       AND (p.is_test=false OR $2::boolean=true)`,
    [productId, includeTestProducts]
  );

  if (!result.rowCount) return null;
  return signDownloadUrl(result.rows[0].object_key);
}
