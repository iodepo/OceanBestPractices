import React, { Component } from "react";
import { connect } from 'react-redux';

import { resetTerms } from '../actions/terms';
import {
  getSearch,
  searchSetFilter,
  searchClearFilters,
  searchUpdateOperator,
  clearSearchTerm,
} from '../actions/search';

import truncate from '../helpers/truncate';

import SearchBarTagNode from './SearchBarTagNode';
import LogicalOperatorNode from './LogicalOperatorNode';

let defaultShortenSize = 20;

class SearchBarTags extends Component {

  constructor() {

    super();

    this.handleTagClick = this.handleTagClick.bind(this);

  }

  handleTagClick(tag, action) {

    if ( tag.type === 'filter' ) {

      if ( action === 'clear' ) {
        this.props.setFilter(tag.index, tag.value, false);
      }

    } else if ( tag.type === 'term' ) {

      if ( action === 'update_operator' ) {
        this.props.updateOperator(tag.index, tag.operator);
      } else if ( action === 'clear' ) {
        this.props.clearSearchTerm(tag.index);
      }

    }

    this.props.search();

  }

  filtersToTags(filters) {

    let filters_array = [];

    if ( typeof filters !== 'object' ) return filters_array;

    for ( let key in filters ) {

      filters_array.push({
        value: filters[key].label,
        type: 'filter',
        index: filters[key].filter,
      });

    }

    return filters_array;

  }

  createSplitSearchTags(tags) {

    if ( !Array.isArray(tags) ) return [];

    return tags.map((tag, index) => {

      const key = `search-tag-${index}-${tag.value}-`;
      const tag_settings = Object.assign({}, tag, {
        value: truncate(tag.value, defaultShortenSize)
      });
      const tag_settings_fields = Object.assign({}, tag, {
        value: tag.fieldId
      });

      let search_tag_identifier = null;

      if ( tag_settings.operator && index !== 0 ) {
        search_tag_identifier = <LogicalOperatorNode key={`${key}-operator`} tag={tag_settings} onClickOp={this.handleTagClick} />;
      } else if ( tag_settings.type === 'filter' ) {
        search_tag_identifier = (
          <span className="searchbar__log-wrapper">
            <span className="searchbar__log-node">
              <i className="fa fa-tags" aria-hidden="true"></i>
            </span>
          </span>
        );
      }

      return (
        <div key={`${key}-tag`} className="searchbar__tag">
          { search_tag_identifier }

          <SearchBarTagNode
            key={`${key}-term`}
            className='searchbar__split-tag'
            tag={tag_settings}
            onClick={this.handleTagClick}
          />

        </div>
      );

    });

  }

  render() {
    return (
      <ul className='searchbar__tag-wrapper'>
        { this.createSplitSearchTags(this.props.active_search) }
        { this.createSplitSearchTags(this.filtersToTags(this.props.active_filters)) }
        {
          this.props.active_search.length > 0
          ? <span className='searchbar__tag-message'>All terms listed affect current search. Clear them to start a new search.</span>
          : null
        }
      </ul>
    );
  }
}


const mapStateToProps = ( state ) => {

  return {
    active_filters: state.searchReducer.activeFilters,
    active_search: state.searchReducer.activeSearch,
    search_term: state.searchReducer.search,
  }

};

const mapDispatchToProps = ( dispatch ) => {

  return {
    search: (term) => dispatch( getSearch(term, {resetTerms: true}) ),
    resetTerms: () => dispatch( resetTerms() ),
    setFilter: (term_uri, label, bool) => dispatch( searchSetFilter(term_uri, label, bool) ),
    clearFilters: () => dispatch( searchClearFilters() ),
    updateOperator: (tag_index, operator) => dispatch( searchUpdateOperator(tag_index, operator) ),
    clearSearchTerm: (tag_index) => dispatch( clearSearchTerm(tag_index) ),
  };

};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SearchBarTags);