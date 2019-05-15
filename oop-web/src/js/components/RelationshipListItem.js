import React, { Component } from "react";

class RelationshipListItem extends Component {
  render() {
    var relationshipName = ( <span className={ "search-sidebar__relationship-name search-sidebar__relationship-" + this.props.graphDirection }>{this.props.type}</span> );
    if(this.props.graphDirection === 'parents') {
      relationshipName = ( <span className={ "search-sidebar__relationship-name search-sidebar__relationship-" + this.props.graphDirection }><i className="fa fa-tag search-sidebar__relationship-tag-icon search-sidebar__relationship-tag-icon-parent" aria-hidden="true" />  {this.props.type}</span> );
    }
    else if(this.props.graphDirection === 'children') {
      relationshipName = ( <span className={ "search-sidebar__relationship-name search-sidebar__relationship-" + this.props.graphDirection }> {this.props.type} <i className="fa fa-tag search-sidebar__relationship-tag-icon search-sidebar__relationship-tag-icon-children" aria-hidden="true" /></span> );
    }
    return (
      <li className="search-sidebar__relationship">
        {relationshipName}
        <ul className="search-sidebar__relationship-list">
          {this.props.items}
        </ul>
      </li>
    )
  }
}

export default RelationshipListItem;
