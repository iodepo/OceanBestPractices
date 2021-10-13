import React, { Component } from "react";
import { connect } from 'react-redux';

import { trackEvent } from '../actions/tracker';

import SearchTipsModal from './SearchTipsModal';

const OPERATORS = [
  'OR',
  'AND',
  'NOT',
];

class LogicalOperatorNode extends Component {

  constructor(props) {
    super(props);

    this.toggleModal = this.toggleModal.bind(this);
    this.setWrapperRef = this.setWrapperRef.bind(this);
    this.handleClickOutside = this.handleClickOutside.bind(this);
    this.handleTagClick = this.handleTagClick.bind(this);

    this.state = {
      isOpen: false,
    }
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  toggleModal(e) {
    this.setState(prevState => ({
      open: !prevState.open
    }));
  }

  setWrapperRef(node) {
    this.wrapperRef = node;
  }

  // This will fire when a click happens outside of the container

  handleClickOutside(event) {
    if (this.wrapperRef && !this.wrapperRef.contains(event.target)) {
      this.setState({
        open: false
      });
    }
  }

  handleTagClick(operator, tag_index) {

    if ( typeof this.props.tag !== 'object' ) return;

    this.props.trackEvent({
      category: 'tag',
      action: 'operator | update',
      label: `${this.props.tag.value} | ${operator}`,
    })

    this.props.onClickOp({
      ...this.props.tag,
      operator: operator,
    }, 'update_operator');

    this.setState({
      open: false
    });

  }

  render() {
    var modalClass = this.state.open ? `searchbar__log-dropdown searchbar__log-dropdown-open` : `searchbar__log-dropdown searchbar__log-dropdown-closed`;
    var activeItem = this.state.open ? 'searchbar__log-node searchbar__log-node-active' : 'searchbar__log-node'
    return (
      <span ref={this.setWrapperRef} className='searchbar__log-wrapper'>
        <span className={activeItem} onClick={this.toggleModal}>
          { this.props.tag.operator } <i className="fa fa-caret-down" aria-hidden="true"></i>
        </span>
        <div className={modalClass}>

          <LogicalOperatorNodeDropdown operators={OPERATORS} tag_index={this.props.index} onClick={this.handleTagClick} active_operator={this.props.tag.operator} />

          <div className='searchbar__log-tips'>Learn more in <SearchTipsModal call="Search Tips" location="operator" /></div>

        </div>
      </span>
    );
  }

}

const mapDispatchToProps = ( dispatch ) => {

  return {
    trackEvent: (settings) => dispatch( trackEvent(settings) ),
  };

};

export default connect(
  null,
  mapDispatchToProps
)(LogicalOperatorNode);


/**
 * LogicalOperatorNodeDropdown
 * @description Node list of available operator dropdown items
 */

const LogicalOperatorNodeDropdown = ({operators, tag_index, onClick, active_operator}) => {

  if ( !Array.isArray(operators) ) return null;

  function handleClick(e) {
    onClick(e.currentTarget.dataset.operator, tag_index);
  }

  return (
    <div className='searchbar__log-dropdown-options'>

      { operators.map((operator, index) => {

        const key = `operator-dropdown-node-${index}-${operator}`;
        let icon_class = 'fa fa-circle-o';

        if ( active_operator === operator ) {
          icon_class = "fa fa-dot-circle-o";
        }

        return (
          <div key={key} onClick={handleClick} data-operator={operator}>
            <i className={icon_class} aria-hidden="true"></i> { operator }
          </div>
        );

      }) }

    </div>
  );

};