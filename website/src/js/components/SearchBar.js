import React, { Component } from "react";
import { connect } from 'react-redux';

import { getAutocomplete, autocompleteIsSelected } from '../actions/autocomplete';
import { setSearch, getSearch, clearSearch } from '../actions/search';
import { setActiveFields } from '../actions/fields';
import { setOption, setActiveOptions } from '../actions/options';

import { constructQuery, parseQuery } from '../helpers/query';
import { formSearchRoute, queryParamsToObject } from '../helpers/url';
import { activeFieldsString } from '../helpers/fields';
import { activeTagsString } from '../helpers/tags';
import { activeSortOption, activeAdvancedOptionsString } from '../helpers/options';

import FieldsDropdown from './FieldsDropdown';
import SearchOptionsDropdown from './SearchOptionsDropdown';
import Autocomplete from './Autocomplete';
import SearchBarTags from './SearchBarTags';
import SearchBarAdvancedStatus from './SearchBarAdvancedStatus';
import Superlink from './Superlink';

class SearchBar extends Component {

  constructor() {

    super();

    this.handleSearch = this.handleSearch.bind(this);
    this.handleClear = this.handleClear.bind(this);
    this.onChange = this.onChange.bind(this)
    this.onAutocompleteClick = this.onAutocompleteClick.bind(this)

  }

  componentDidMount() {
    this.bootstrapQuery();
  }

  componentDidUpdate() {
    this.updateQuery();
  }

  /**
   * bootstrapQuery
   * @description Takes the URL parameter and injects the query into the application on start
   */

  bootstrapQuery() {

    let starting_query;
    let params;

    if ( typeof window !== 'undefined' ) {
      params = queryParamsToObject(window.location.search);
    }

    if ( params ) {

      if ( params.q && params.q.length > 0 ) {
        starting_query = parseQuery(params.q);
        this.props.dispatch(setSearch('', starting_query));
      }

      if (params.fields && params.fields.length > 0 ) {
        this.props.dispatch(setActiveFields(params.fields));
      }

      if ( params.options && params.options.length > 0 ) {
        this.props.dispatch(setActiveOptions(params.options));
      }

      if ( params.sort && params.sort.length > 0 ) {
        this.props.dispatch(setOption('sort', params.sort));
      }

    }

    if ( starting_query ) {
      this.props.dispatch(getSearch(null, {resetTerms: true}));
    }

  }

  /**
   * updateQuery
   * @description Constructs the query given the active search and pushes it to the browser history
   */

  updateQuery() {

    if ( isHome() || isTagger() ) return;

    const { activeSearch } = this.props.searchReducer;
    let query;

    if ( activeSearch.length > 0 ) {
      query = constructQuery(activeSearch);
    }

    this.navigateToSearch(query);

  }

  /**
   * navigateToSearch
   * @description Pushes the given active search string to the browser history
   */

  navigateToSearch(active_search) {

    const active_sort = activeSortOption(this.props.options);

    const route = formSearchRoute({
      active_fields: activeFieldsString(this.props.fields),
      active_tags: activeTagsString(this.props.searchReducer.activeFilters),
      active_options: activeAdvancedOptionsString(this.props.options),
      active_sort: active_sort.filter,
      active_search,
    });

    if ( window.location.search !== route.search ) {
      this.props.history.push(route);
    }

  }

  /**
   * handleSearch
   * @description Fires upon form submission of the search input
   */

  handleSearch(event) {

    event.preventDefault();

    if ( this.props.searchReducer.search ) {
      this.props.dispatch(autocompleteIsSelected(true));
      this.props.dispatch(getSearch(this.props.searchReducer.search, {resetRelationships: true, resetTerms: true}));
    }

    if ( isHome() || isTagger() ) {
      this.navigateToSearch(this.props.searchReducer.search);
    }

  }

  /**
   * handleClear
   * @description Clears the search input when triggered
   */

  handleClear() {
    this.props.dispatch(clearSearch());
  }

  /**
   * onChange
   * @description Fires upon input change. Sets the search and triggers autocomplete request
   */

  onChange(event) {
    console.log('🚀 ~ file: SearchBar.js ~ line 162 ~ SearchBar ~ onChange ~ event', event.target.value)
    this.props.dispatch(setSearch(event.target.value));
    this.props.dispatch(getAutocomplete(event.target.value));
  }

  /**
   * onAutocompleteClick
   * @description Fires upon autocomplete selection and triggers a new search
   */

  onAutocompleteClick(text) {

    this.props.dispatch(getSearch(text, {resetTerms: true}));

    if ( isHome() || isTagger() ) {
      this.navigateToSearch(text);
    }

  }

  /**
   * isActiveSearch
   * @description Does the search currently have a value?
   */

  isActiveSearch() {
    const { search } = this.props.searchReducer;
    return typeof search === 'string' && search.length > 0;
  }

  render() {

    const { search } = this.props.searchReducer;

    return (
      <div>

        <form className={"searchbar " + ( this.isActiveSearch() ? 'searchbar--active' : '' ) } onSubmit={this.handleSearch}>

          <div className="searchbar__input--prepend">
            <FieldsDropdown />
          </div>

          <div className="searchbar__input--autocomplete">
            <input type="text" required={search.length === 0} className="searchbar__input" placeholder="Search OceanBestPractices" value={search} onChange={this.onChange} />
            <Autocomplete onAutocompleteClick={this.onAutocompleteClick.bind(this)}/>
          </div>


          <div className="searchbar__input--append">

            <SearchOptionsDropdown />

            <div className="searchbar__input--append--button">

              <Superlink event_category="searchbar" event_action="search" event_label="fa-search">
                <button className="button button--icon button--icon-only searchbar__search-button" type="fa-search">
                  <i className="fa fa-search button__icon"></i>
                  <span className="button__text">Submit</span>
                </button>
              </Superlink>

              <Superlink event_category="searchbar" event_action="clear" event_label="fa-close">
                <button className="button button--icon button--icon-only button--icon-dark searchbar__clear-button" type="reset" onClick={this.handleClear.bind(this)}>
                  <i className="fa fa-close button__icon"></i>
                  <span className="button__text">Clear</span>
                </button>
              </Superlink>

            </div>

          </div>

        </form>

        <div className="row">
          <div className="col-9">
            <SearchBarTags />
          </div>
          <div className="col-3">
            <SearchBarAdvancedStatus />
          </div>
        </div>

      </div>
    );

  }

}

export default connect(state => state)(SearchBar);


function isHome() {
  if ( typeof window === 'undefined' ) return true;
  return window.location.pathname === '/';
}


function isTagger() {
  if( typeof window === 'undefined') return true;
  return window.location.pathname === '/tagger';
}
