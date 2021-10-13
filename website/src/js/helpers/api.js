import { constructQuery } from './query';

export const baseAPIURL = process.env.REACT_APP_API_ENDPOINT;
export const defaultQuerySize = 50;
export const defaultQueryOffset = 0;
export const env = baseAPIURL.substr(baseAPIURL.lastIndexOf('/') + 1);


// Creates the autocomplete url

export const createAPIAutocompleteURL = (query, synonyms = false) => {

  let url = `${ baseAPIURL }/documents/autocomplete/`;

  if (query && query.length) {
    url = `${url}?input=${ encodeURIComponent(query) }`
  }

  if ( synonyms ) {
    url = addParam(url, 'synonyms', synonyms);
  }

  return url;
}


// Creates the search url based on the provided params

export const createAPISearchURL = (query, options) => {

  let url = `${ baseAPIURL }/documents?keywords=${ constructQuery(query) }`;

  let size = options.size || defaultQuerySize;
  let offset = options.offset || defaultQueryOffset;
  let sort = options.sort;
  let term = options.term;
  let termURI = options.termURI;
  let fields = options.fields;
  let synonyms = options.synonyms;
  let refereed = options.refereed;

  if ( Array.isArray(fields) ) {
    url = addParam(url, 'fields', fields.join(','));
  }

  if ( size ) {
    url = addParam(url, 'size', size);
  }

  if ( offset ) {
    url = addParam(url, 'from', offset);
  }

  if ( sort ) {
    url = addParam(url, 'sort', sort);
  }

  if ( term ) {
    url = addParam(url, 'term', encodeURIComponent(term));
  }

  if ( termURI ) {
    url = addParam(url, 'termURI', encodeURIComponent(termURI));
  }

  if ( synonyms ) {
    url = addParam(url, 'synonyms', synonyms);
  }

  if ( refereed ) {
    url = addParam(url, 'refereed', refereed);
  }

  return url;
}


// Creates the relationships url based on the provided query

export const createAPIRelationshipsURL = (query) => {
  let url = `${ baseAPIURL }/terms/graph/?termURI=${ encodeURIComponent(query) }`;
  return url;
}


// Creates the stats url

export const createAPIStatsURL = () => {
  const url = `${ baseAPIURL }/statistics/`;
  return url;
}

// Creates the tagger url

export const createAPITaggerURL = () => {
  let url = `${ baseAPIURL }/documents/preview/`;
  return url;
}

export const createAPITaggerCSVURL = () => {
  let url = `${ baseAPIURL }/documents/preview?form=csv`;
  return url;
}


// Adds the parameters based on parameter name and value

export const addParam = (url, paramType, paramValue) => {
  return `${url}&${paramType}=${paramValue}`;
}
