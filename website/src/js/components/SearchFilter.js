import React, { Component } from "react";
import { connect } from 'react-redux';

import FilterNode from './FilterNode';
import { getSearch } from '../actions/search';
import { setOption } from '../actions/options';
import { trackEvent } from '../actions/tracker';
import { activeSortOption, optionById } from '../helpers/options';

class SearchFilter extends Component {


  onSortSelect(label, direction, sortFilter) {

    this.props.dispatch(setOption('sort', sortFilter));
    this.props.dispatch(getSearch(null, { resetTerms: true }));

    this.props.trackEvent({
      category: 'dropdown',
      action: 'set active | Sort',
      label:  `${label} | ${direction}`,
    });

  }

  render() {

    const sort = optionById(this.props.options, 'sort');
    const active_sort = activeSortOption(this.props.options);

    const sort_items = Array.isArray(sort.items) && sort.items.map((item) => {

      let {
        label,
        direction,
        filter
      } = item;

      return <FilterNode onClick={() => this.onSortSelect(label, direction, filter)}
        key={filter}
        label={label}
        direction={direction}
        />
    });

    return (
      <div className="search-filter">

        <span className="search-filter__label">SORT BY</span>

        <div className="search-filter__button">

          <FilterNode class_name="search-filter__text" label={active_sort.label} direction={active_sort.direction} displayed = {true}/>

          <div className="search-filter__dropdown">
            { sort_items }
          </div>

        </div>

      </div>
    );
  }
}

const mapDispatchToProps = ( dispatch ) => {

  return {
    dispatch: dispatch,
    trackEvent: (settings) => dispatch( trackEvent(settings) ),
  };

};

export default connect(
  state => state,
  mapDispatchToProps
)(SearchFilter);
