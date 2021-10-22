export default function truncate(str, max_length) {

  if ( typeof str !== 'string' || str.length <= max_length ) return str;

  return str.substring(0, max_length - 3 ) + '...';

}