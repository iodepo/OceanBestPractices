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

export function constructFields(fields) {
  if ( typeof fields === 'string' ) {
     return encodeURIComponent(fields);
  }
  
  return fields.map((segment, index) => {

    if ( segment.type !== 'term' || typeof segment.fieldId !== 'string' ) return undefined;

    let keyword = '';
  
    console.log("trim: " +segment.fieldId.trim())
    keyword += segment.fieldId.trim();
    console.log("keyword: " + keyword);
    return encodeURIComponent(keyword);

  }).filter(segment => !!(segment)).join(',');
}