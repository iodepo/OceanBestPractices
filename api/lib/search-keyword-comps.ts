export interface SearchKeywordComps {
  operator: string
  field: string
  term: string
}

export const parseSearchKeyword = (searchKeyword: string): SearchKeywordComps => {
  const keywordComps = searchKeyword.split(/(?<!\\):/);
  if (keywordComps.length !== 3) {
    throw new Error(`Invalid search keyword "${searchKeyword}". Keywords must include an operator, field, and term components.`);
  }

  const [
    operator = '',
  ] = keywordComps;

  let [
    ,
    field,
    term,
  ] = keywordComps;

  if (field === undefined || field === '') {
    field = '*';
  }

  if (term === undefined || term === '') {
    term = '*';
  }

  return {
    operator,
    field,
    term,
  };
};
