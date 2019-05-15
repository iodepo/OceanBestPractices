import React from 'react';


class LinkListItemToggle extends React.Component {
  constructor(props) {
    super(props);
    
    this.toggleModal = this.toggleModal.bind(this);
    this.setWrapperRef = this.setWrapperRef.bind(this);
    this.handleClickOutside = this.handleClickOutside.bind(this);
    
    this.state = {
      open:false
    };
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

  // This will fire when a click happens outside of the nav item container

  handleClickOutside(event) {
    if (this.wrapperRef && !this.wrapperRef.contains(event.target)) {
      this.setState({
        open:false
      });
    }
  }
  
  render() {
    var modal = this.state.open ? `${this.props.toggleModalClass} link__list-toggle-active` : `${this.props.toggleModalClass}`;
    var arrowDir;
    if (this.props.flipArrow) {
      arrowDir = this.state.open ? 'down' : 'up';
    }
    else {
      arrowDir = this.state.open ? 'up' : 'down';
    }
    var arrow = `fa fa-chevron-${arrowDir}`;
    return(
      <li className={this.props.toggleButtonClass} ref={this.setWrapperRef}>
        <span onClick={this.toggleModal}>
          {this.props.label}<i className={arrow}></i>
        </span>
        <div className={modal}>{this.props.children}</div>
      </li>
    );
  }
}


export default LinkListItemToggle;
