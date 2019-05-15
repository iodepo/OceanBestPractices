export function formSearchRoute(data = {}) {

  let route = {
    pathname: '/search',
  };

  let params = [];

  if ( typeof data.active_search === 'string' && data.active_search.length > 0 ) {
    params.push({
      title: 'q',
      value: data.active_search,
    });
  }

  if ( data.active_fields ) {
    params.push({
      title: 'fields',
      value: data.active_fields,
    });
  }

  if ( data.active_tags ) {
    params.push({
      title: 'tags',
      value: data.active_tags,
    });
  }

  if ( data.active_options ) {
    params.push({
      title: 'options',
      value: data.active_options,
    });
  }

  if ( data.active_sort ) {
    params.push({
      title: 'sort',
      value: data.active_sort,
    });
  }

  if ( params.length > 0 ) {
    route.search = `?${params.map(param => `${param.title}=${param.value}`).join('&')}`;
  }

  return route;

}

export function getUrlParamString(url) {

  if ( typeof url !== 'string' ) return null;

  return url.split('?')[1].split('#')[0];

}

export function getUrlParamObject(url) {

  if ( typeof url !== 'string' ) return {};

  var params = getUrlParamString(url);

  return queryParamsToObject(params);

}

export function queryParamsToObject(string) {

  if ( typeof string !== 'string' ) return {};

  let query_string = string.replace('?', '');
  let query_split = query_string.split('&');
  let query_object = {};

  for ( var i = 0, len = query_split.length; i < len; i++ ) {

    const current_split = query_split[i].split('=');

    if ( !current_split[0] || current_split[0] === '' ) continue;

    query_object[decodeURIComponent(current_split[0])] = decodeURIComponent(current_split[1]);

  }

  return query_object;

}