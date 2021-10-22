import React, { Component } from "react";

class FilterNode extends Component {

  render() {

    let direction;
    let arrow;

    if ( this.props.direction ) {

      direction = <span>( {this.props.direction} )</span>;

      arrow = 'fa fa-long-arrow-';

      if ( this.props.direction.trim() === 'asc') {
        arrow += 'up';
      } else {
        arrow += 'down';
      }

      arrow = <i className={ arrow } aria-hidden="true"></i>

    }

    return (
      <li className={`search-filter__node ${this.props.class_name || ''}`} onClick={this.props.onClick}>
        <strong>{ this.props.label }</strong> { direction } { arrow }
      </li>
    );

  }
}

export default FilterNode;
