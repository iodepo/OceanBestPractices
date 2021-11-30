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

class FullScreenModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      modalIsOpen: props.open === true
    };

    this.openModal = this.openModal.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.closeLabel = props.closeLabel || "Close";
    this.appElement = props.appElement || document.querySelector("#root");
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
    }, () => {
      if (typeof this.props.onClose === 'function') {
        this.props.onClose();
      }
    });
  }

  render() {
    var labelClass = `${this.props.modalClass}__label`;
    var titleCTA = this.props.titleCTA ?
    (
      this.props.titleCTA
    ):
    (
      null
    );
    if(this.props.smallModal && this.props.smallModal !== 'true') customSmallStyles.content.width = this.props.smallModal;
    let modal = this.props.smallModal ?
    (
      <Modal
        isOpen={this.state.modalIsOpen}
        onRequestClose={this.closeModal}
        style={customSmallStyles}
        contentLabel="Example Modal"
        shouldCloseOnEsc={true}
        appElement={this.appElement}
      >
        <div className='tip__modal-header'>
          <span>{this.props.modalTitle}{titleCTA}</span>
          <span><i className='fa fa-close' onClick={this.closeModal}></i></span>
        </div>
        {this.props.children}
        <div className='tip__modal-footer'>
          <button className='tip__modal-footer-close' onClick={this.closeModal}>
            {this.closeLabel}
          </button>
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
        appElement={this.appElement}
      >
        <div className='tip__modal-header'>
          <span>{this.props.modalTitle}{titleCTA}</span>
          <span><i className='fa fa-close' onClick={this.closeModal}></i></span>
        </div>
        {this.props.children}
        <div className='tip__modal-footer'>
          <button className='tip__modal-footer-close' onClick={this.closeModal}>
            {this.closeLabel}
          </button>
        </div>
      </Modal>
    )

    // renders modal without a link to open (modal will never show if props.open is not true)
    if (this.props.noLink === true) {
      return (
        <div className='tips__modal-header-wrapper'>
          {modal}
        </div>
      )
    }

    // default render link to open modal
    return (
      <div className='tips__modal-header-wrapper'>
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
