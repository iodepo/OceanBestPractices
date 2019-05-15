import React, { Component } from "react";
import { connect } from 'react-redux';
import Recaptcha from 'react-recaptcha';

import Wrapper from './Wrapper';
import Superlink from '../components/Superlink';
import TaggerResults from '../components/TaggerResults';

import { getTags, getTagsCSV } from '../actions/tagger';

class Tagger extends Component {
  constructor(props) {
    super(props);

    // set recaptcha to true during development to easily access tagger results
    this.state = {
      title: '',
      content: '',
      recaptcha: false,
      resultView: false,
    };

    this.handleTitle = this.handleTitle.bind(this);
    this.handleBody = this.handleBody.bind(this);
    this.handleRecaptcha = this.handleRecaptcha.bind(this);
    this.handleExpiredRecaptcha = this.handleExpiredRecaptcha.bind(this);
    this.toggleToInput = this.toggleToInput.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }
  
  handleTitle(event) {
    this.setState({title: event.target.value});
  }
  
  handleBody(event) {
    this.setState({content: event.target.value});
  }
  
  handleRecaptcha(recaptchaToken) {
    this.setState({recaptcha: true});
  }
  
  handleExpiredRecaptcha() {
    this.setState({recaptcha: false});
  }
  
  toggleToInput() {
    // set recaptcha to true to easily access tagger results
    this.setState({
      title: '',
      content: '',
      recaptcha: false,
      resultView: false,
    });
  }
  
  handleSubmit(event) {
    event.preventDefault();
    
    if(this.state.content && this.state.recaptcha){
      this.props.dispatch(getTags(this.state.title, this.state.content));
      // CSV call is to populate download CSV results on results page
      this.props.dispatch(getTagsCSV(this.state.title, this.state.content));
      this.setState({resultView: true});
    }
  }

  render() {
    // Set the results to the current state of the taggerReducer State
    let results = this.props.taggerReducer.items.map((result) => {
      return{
        label: result.label,
        source_terminology: result.source_terminology,
        uri: result.uri
      }
    })
    
    // We only need the CSV value for downloading, not for populating results
    let resultsCSV = this.props.taggerReducer.itemsCSV;
    
    let searchStatus,
        disableSubmit = true;
    
    //Status for loading tagger results
    if (this.props.taggerReducer.isLoading) {
      searchStatus = (
        <span>Your document is being tagged. Hold tight!</span>
      )
    }
    else if(this.props.taggerReducer.hasErrored) {
      searchStatus = (
        <span>Uh oh. Looks like something may have gone wrong. Try searching again. If that doesn't work, try refreshing your browser.</span>
      )
    }
    
    if(this.state.content && this.state.recaptcha) disableSubmit = false;
    
    // Change the number below to change the max amount of characters in the textarea
    const contentMaxLength = 50000;

    const history = this.props.history;
    const recaptchaSiteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
    
    // input view of the tagger
    const taggerInput = (
      <div>
        <span className="tagger__header">OceanKnowledge Tagger (Beta)</span>
        <span className="tagger__info">Welcome to the OceanKnowledge Tagger! This tool will "tag" or annotate your text with matching terms from quality-controlled, FAIR vocabularies and ontologies. You can download a ranked list of tags in CSV or JSON format</span>
        <div className="tagger__form-wrapper">
          <form onSubmit={this.handleSubmit}>
            <span className="tagger__title">
              <input type="text" placeholder="Paste the title of your text here (optional)" value={this.state.title} onChange={this.handleTitle}/>
            </span>
            <span className="tagger__body">
              <textarea maxLength={contentMaxLength} placeholder="Paste the body of your text here" value={this.state.content} onChange={this.handleBody}/>
            </span>
            <span className="tagger__recaptcha">
              <Recaptcha
                sitekey={recaptchaSiteKey}
                verifyCallback={this.handleRecaptcha}
                expiredCallback={this.handleExpiredRecaptcha}
              />
            </span>
            <span className="tagger__submit">
              <Superlink event_category="tagger" event_action="tagger" event_label="tagger">
                <button className={disableSubmit ? 'button tagger__submit-button tagger__button-disable' : 'button tagger__submit-button'} type="submit" disabled={disableSubmit}>
                  <span className="button__text">Submit</span>
                </button>
              </Superlink>
            </span>
          </form>
        </div>
      </div>
    );
    
    const taggerResults = (
      <div className="tagger-results__container">
        <span className="tagger-results__back-button" onClick={this.toggleToInput}><i className="fa fa-chevron-left" aria-hidden="true"/> Back to OceanKnowledge Tagger</span>
        <span className="tagger-results__status">{searchStatus}</span>
        { this.props.taggerReducer.isLoading || this.props.taggerReducer.hasErrored ? null : <TaggerResults results={results} resultsCSV={resultsCSV}/> }
      </div>
    );

    return (
        <Wrapper header={true} history={history} page="tagger" childrenContainerClass="tagger" footerLinks={true}>
          {
            this.state.resultView
            ? taggerResults
            : taggerInput
          }
        </Wrapper>
    );
  }
}

export default connect(state => state)(Tagger);
