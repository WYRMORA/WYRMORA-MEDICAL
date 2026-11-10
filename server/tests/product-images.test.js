import test from 'node:test';
import assert from 'node:assert/strict';
import { createProductImageDownloadUrl } from '../src/lib/product-images.js';

test('public product image signing uses the stored object key, not the asset UUID', async () => {
  let capturedSql = '';
  let capturedParams = null;
  let signedKey = null;

  const url = await createProductImageDownloadUrl({
    productId: 'product-123',
    includeTestProducts: false,
    query: async (sql, params) => {
      capturedSql = sql;
      capturedParams = params;
      return {
        rowCount: 1,
        rows: [{ object_key: 'private/product_image/42/asset-123.webp' }]
      };
    },
    signDownloadUrl: async key => {
      signedKey = key;
      return 'https://storage.example.test/signed-image';
    }
  });

  assert.equal(url, 'https://storage.example.test/signed-image');
  assert.equal(signedKey, 'private/product_image/42/asset-123.webp');
  assert.deepEqual(capturedParams, ['product-123', false]);
  assert.match(capturedSql, /JOIN private_assets asset/);
  assert.match(capturedSql, /asset\.purpose='product_image'/);
  assert.match(capturedSql, /asset\.status='uploaded'/);
  assert.match(capturedSql, /p\.is_test=false OR \$2::boolean=true/);
});

test('public product image lookup does not sign an unavailable or unapproved image', async () => {
  let signCalled = false;

  const url = await createProductImageDownloadUrl({
    productId: 'product-404',
    includeTestProducts: false,
    query: async () => ({ rowCount: 0, rows: [] }),
    signDownloadUrl: async () => {
      signCalled = true;
      return 'https://storage.example.test/should-not-be-used';
    }
  });

  assert.equal(url, null);
  assert.equal(signCalled, false);
});

test('public product image lookup can include TEST ONLY images only when the feature flag is enabled', async () => {
  let capturedParams = null;

  await createProductImageDownloadUrl({
    productId: 'test-product',
    includeTestProducts: true,
    query: async (_sql, params) => {
      capturedParams = params;
      return { rowCount: 0, rows: [] };
    },
    signDownloadUrl: async () => 'https://storage.example.test/image'
  });

  assert.deepEqual(capturedParams, ['test-product', true]);
});
