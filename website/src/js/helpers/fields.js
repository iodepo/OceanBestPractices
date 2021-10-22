/**
 * activeFieldsString
 * @description Returns a comma delimited string of active search fields
 */

export function activeFieldsString(fields = []) {

  if ( !Array.isArray(fields) ) return;

  return fields
    .filter(field => !!(field.active_search))
    .map(field => field.id)
    .join(',');

}