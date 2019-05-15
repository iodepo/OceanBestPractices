export default function convertFiltersToLabels(filterObj) {
  
    let activeFilters = {};
    let combinedFilters = [];

    // Loop through the filter object and find the filters that are set to true. These are the
    // currently active filters. Push them onto the activeFilters object

    for (var label in filterObj) {
      if (filterObj.hasOwnProperty(label)) {
         if (filterObj[label]) activeFilters[label] = filterObj[label];
      }
    }
    // Loop through the activeFilters object and use it to create the filter url string

    for(var activeKeys = Object.keys(activeFilters), i = 0, len = Object.keys(activeFilters).length; i < len; i++) {
      const label = activeKeys[i]
      combinedFilters.push(label);
    }

    return combinedFilters;
}
