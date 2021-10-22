/**
 * optionById
 * @description
 */

export function optionById(options, id) {

  if ( !Array.isArray(options) ) return false;

  return options.find(option => option.id === id);

}


/**
 * optionIsActiveById
 * @description Determines if an option is active by it's ID
 */

export function optionIsActiveById(options, option_id) {

  if ( !Array.isArray(options) ) return false;

  let option = optionById(options, option_id);

  return option && !!(option.value);

}


/**
 * activeAdvancedOptionsString
 * @description REturns a list of active options. Allows the ability to specific the label used, which
 *     typically would be the label or ID (default). Additionally, you can pass in a custom delimiter
 */

export function activeAdvancedOptionsString(options = [], label = 'id', delimiter = ',') {

  if ( !Array.isArray(options) ) return [];

  return options
    .filter(option => option.is_advanced_search && !!(option.value))
    .map(option => option[label])
    .join(delimiter);

}


/**
 * activeSortOption
 * @description
 */

export function activeSortOption(options = []) {

  const default_value = {};

  if ( !Array.isArray(options) ) return default_value;

  const sort = options.find(item => item.id === 'sort' );

  if ( !Array.isArray(sort.items) ) return default_value;

  return sort.items.find(item => item.filter === sort.value) || default_value;

}