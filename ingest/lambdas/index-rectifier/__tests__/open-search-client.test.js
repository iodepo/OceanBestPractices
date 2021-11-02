const osc = require('../open-search-client');

describe('open-search-client', () => {
  describe('openScroll', () => {});

  describe('nextScroll', () => {});

  describe('closeScroll', () => {});

  describe('bulkDelete', () => {
    test.only('it should bulk delete documents for a given list of IDs', async () => {
      const result = await osc.bulkDelete('foo', 'bar', ['1', '2', '3']);
      console.log(result);
    });
  });
});
