/**
 * PDF Viewer - Augments PDF.js from Mozilla
 * Via https://github.com/mozilla/pdf.js
 * When editing, please update the v= param on the JS include at the bottom of viewer/index.html to bust cache
 */

(function() {

  if ( typeof window === 'undefined' ) return;

  var search_has_initialized = false;
  var dropdown_select_term = document.querySelector('.toolbar-extended-actions-terms select');
  var query_params = getUrlParamObject(window.location.href);

  var action_ids_to_track = [
    'sidebarToggle',
    'viewThumbnail',
    'viewOutline',
    'viewAttachments',
    'viewFind',
    'next',
    'previous',
    'zoomIn',
    'zoomOut',
    'presentationMode',
    'openFile',
    'print',
    'download',
    'secondaryToolbarToggle',
    'findPrevious',
    'findNext',
  ];

  // When the page is rendered, kickoff the viewer bootstrapping to prepopulate any
  // predefined search term data

  document.addEventListener('pagerendered', bootstrapViewer);

  action_ids_to_track.forEach(function(id) {

    var button = document.getElementById(id);

    button.addEventListener('click', function() {
      trackEvent({
        category: 'viewer',
        action: 'pdf | ' + id,
        label: query_params.file
      });

    });
  });

  // Set an event listener that takes the dropdown options value and trigge3rs
  // a search with it. The default menu item is an empty string, which will
  // natively clear the highlighting results

  dropdown_select_term.addEventListener('change', function(e) {

    triggerSearchQuery(e.target.value);

    dropdown_select_term.selectedIndex = 0;

    trackEvent({
      category: 'viewer',
      action: 'term | select',
      label: e.target.value
    });

  });


  /**
   * bootstrapViewer
   * @description Sets up the PDF viewer for the initial state
   */

  function bootstrapViewer(event) {

    var first_term;

    if ( !search_has_initialized ) {

      first_term = firstTermFromQuery(query_params.search);

      search_has_initialized = triggerSearchQuery(first_term);

      setupDropdownTerms(query_params.search);

    }

  }

  /**
   * triggerSearchQuery
   * @description Triggers a search event on the PDF viewer. Returns true or false depending on success
   */

  function triggerSearchQuery(search_term, settings) {

    if ( typeof search_term !== 'string' || !PDFViewerApplication || !PDFViewerApplication.findController ) {
      return false;
    }
    
    var term = search_term.replace(/,/g," ");
    //@jkuo Removing the double quotes from the query because it couldn't be found in the PDF otherwise
    term = term.replace(/"/g, "");

    var find_settings = Object.assign({
      query: term,
      phraseSearch: true,
      caseSensitive: false,
      highlightAll: true
    }, settings || {});

    PDFViewerApplication.findController.executeCommand('find', find_settings);
    PDFViewerApplication.findBar.findField.value = term;
    PDFViewerApplication.findBar.highlightAll.checked = true;
    PDFViewerApplication.findBar.phraseSearch.checked = true;
    PDFViewerApplication.findBar.open();

    return true;

  }

  /**
   * setupDropdownTerms
   * @description
   */

  function setupDropdownTerms(search_term) {

    if ( typeof search_term !== 'string' ) return;

    var select = document.querySelector('.toolbar-extended-actions-terms select');
    var vdom = document.createElement('select');

    search_term = search_term.split(',').map(function(term) {
      return createSelectOptionFromString(term);
    });

    search_term.unshift(createSelectOptionFromString('Select Term', ''))

    search_term.forEach(function(option) {
      vdom.appendChild(option);
    });

    select.innerHTML = vdom.innerHTML;

  }

  /**
   * createSelectOptionFromString
   * @description
   */

  function createSelectOptionFromString(string, value) {

    if ( typeof value === 'undefined' ) {
      value = string;
    }

    var item = document.createElement('option');
    
    string = string.split('"').join('');
    value = value.split('"').join('');

    item.innerText = string;
    item.setAttribute('value', value);

    return item;

  }

  /**
   * getUrlParamString
   * @description Takes a URL string and returns only param query string
   */

  function getUrlParamString( url ) {

    if ( typeof url !== 'string' ) return null;

    return url.split( '?' )[1].split('#')[0];

  }

  /**
   * getUrlParamObject
   * @description Takes a url string and returns an object of all param queries
   */

  function getUrlParamObject( url ) {

    if ( typeof url !== 'string' ) return null;

    const params = getUrlParamString( url );

    return queryParamsToObject( params );

  }

  /**
   * queryParamsToObject
   * @description Takes the URL param string and turns it into an oobject
   */

  function queryParamsToObject( string ) {

    if ( typeof string !== 'string' ) return null;

    const query_string = string.replace( '?', '' );
    const query_split = query_string.split( '&' );
    let query_object = {};

    for ( let i = 0, len = query_split.length; i < len; i++ ) {

      const current_split = query_split[i].split( '=' );
      query_object[decodeURIComponent( current_split[0])] = decodeURIComponent( current_split[1]);

    }

    return query_object;

  }

  /**
   * firstTermFromQuery
   * @description
   */

  function firstTermFromQuery( string ) {

    if ( typeof string !== 'string' ) return null;

    return string.split(',')[0];

  }

  /**
   * trackEvent
   * @description Triggers a custom event with the given settings
   */

  function trackEvent(settings) {
    if ( typeof gtag !== 'function' ) return;
    gtag('event', settings.action, {
      'event_category' : settings.category,
      'event_label' : settings.label
    });
  }

})();
