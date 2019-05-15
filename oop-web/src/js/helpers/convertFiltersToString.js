export default function convertFiltersToString(filterObj) {

  let activeFilters = {};

  // Loop through the filter object and find the filters that are set to true. These are the
  // currently active filters. Push them onto the activeFilters object

  for ( let filter_key in filterObj ) {

    if ( !filterObj.hasOwnProperty(filter_key) ) continue;

    if ( filterObj[filter_key] ) {
      activeFilters[filter_key] = filterObj[filter_key];
    }

  }

  // Loop through the activeFilters object and use it to create the filter url string

  return Object.keys(activeFilters).map((active_filter_key) => {

    const filter = activeFilters[active_filter_key];

    return filter.filter;

  }).join(',');

}
