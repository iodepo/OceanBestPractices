import React, { Component } from "react";
import { connect } from 'react-redux';
import Modal from 'react-modal';

import { trackEvent } from '../actions/tracker';

import Superlink from './Superlink';

const customStyles = {
  content : {
    top                   : '50%',
    left                  : '50%',
    right                 : 'auto',
    bottom                : 'auto',
    marginRight           : '-25%',
    transform             : 'translate(-50%, -50%)'
  }
};

const customSmallStyles = {
  content : {
    top                   : '50%',
    left                  : '50%',
    right                 : 'auto',
    bottom                : 'auto',
    marginRight           : '-25%',
    transform             : 'translate(-50%, -50%)',
    width                 : '60%'
  }
};

Modal.setAppElement('#root')

class FullScreenModal extends Component {
  constructor() {
    super();

    this.state = {
      modalIsOpen: false
    };

    this.openModal = this.openModal.bind(this);
    this.closeModal = this.closeModal.bind(this);
  }

  fireEvent() {
    this.props.trackEvent({
      category: 'modal',
      action: `open | ${this.props.modalTitle}`,
      label: this.props.modalCTA,
    });
  }

  openModal() {

    this.setState({
      modalIsOpen: true
    });

    this.fireEvent();

  }

  closeModal() {
    this.setState({
      modalIsOpen: false
    });
  }

  render() {
    var labelClass = `${this.props.modalClass}__label`;
    let modal = this.props.smallModal ?
    (
      <Modal
        isOpen={this.state.modalIsOpen}
        onRequestClose={this.closeModal}
        style={customSmallStyles}
        contentLabel="Example Modal"
        shouldCloseOnEsc={true}
      >
        <div className='tip__modal-header'>
          <span>{this.props.modalTitle}</span>
          <span><i className='fa fa-close' onClick={this.closeModal}></i></span>
        </div>
        {this.props.children}
        <div className='tip__modal-footer'>
          <button className='tip__modal-footer-close' onClick={this.closeModal}>Close</button>
        </div>
      </Modal>
    ) :
    (
      <Modal
        isOpen={this.state.modalIsOpen}
        onRequestClose={this.closeModal}
        style={customStyles}
        contentLabel="Example Modal"
        shouldCloseOnEsc={true}
      >
        <div className='tip__modal-header'>
          <span>{this.props.modalTitle}</span>
          <span><i className='fa fa-close' onClick={this.closeModal}></i></span>
        </div>
        {this.props.children}
        <div className='tip__modal-footer'>
          <button className='tip__modal-footer-close' onClick={this.closeModal}>Close</button>
        </div>
      </Modal>
    )
    return (
      <div>
        <Superlink event_category={this.props.location || 'website'} event_action="link" event_label={`modal | ${this.props.modalCTA}`}>
          <div className={labelClass} onClick={this.openModal}>{this.props.modalCTA}</div>
        </Superlink>
        {modal}
      </div>
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
)(FullScreenModal);
