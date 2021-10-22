/**
 * activeTagsString
 * @description Returns a comma delimited string of active tags the user is searching for
 */

export function activeTagsString(tags = {}) {

  if ( typeof tags !== 'object' ) return;

  let active_tags = [];

  for ( let key in tags ) {

    if ( !tags.hasOwnProperty(key) ) continue;

    if ( tags[key].label && tags[key].active ) {
      active_tags.push(tags[key].label);
    }

  }

  return active_tags.join(',');

}