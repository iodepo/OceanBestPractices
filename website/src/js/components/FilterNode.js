import React, { Component } from "react";

class FilterNode extends Component {

  render() {
    let direction;
    let arrow;
    let spacing = "";

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
   
    else if (this.props.displayed == true) {
      arrow = <i className='fa fa-chevron-down' aria-hidden="true"></i>
      spacing = <a style={{ marginLeft: '.25rem' }}/>
    }

    return (
      <li className={`search-filter__node ${this.props.class_name || ''}`} onClick={this.props.onClick}>
        <strong> { this.props.label } {spacing} </strong> { direction } { arrow }
      </li>
    );

  }
}

export default FilterNode;
