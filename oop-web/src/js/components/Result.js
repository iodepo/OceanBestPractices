import React, { Component } from "react";
import { connect } from 'react-redux';
import Citation from './Citation';

import { constructViewerQuery } from '../helpers/query';
import { env } from '../helpers/api';

import Superlink from './Superlink';

class Result extends Component {
  
  hashLinkScroll() {
    const { hash } = window.location;
    if (hash !== '') {
      // Push onto callback queue so it runs after the DOM is updated,
      // this is required when navigating from a different page so that
      // the element is rendered on the page before trying to getElementById.
      setTimeout(() => {
        const id = hash.replace('#', '');
        const element = document.getElementById(id);
        if (element) element.scrollIntoView();
      }, 0);
    }
  }

  
  state = {
    showCitation: false,
    showDocument: false,
  };

  handleTagToggle() {
    this.props.onSetTerms({
      id: this.props.id,
      title: this.props.title,
      terms: this.props.terms
    })
  }

  onReset() {
    this.props.onResetTerms();
  }

  componentListFromStrings(string_list) {
    if ( !Array.isArray(string_list) ) return [];

    return string_list.map(string => {
      return <span dangerouslySetInnerHTML={{__html: string}} />
    });
  }

  state = {
    showCitation: false,
  };

  launchPDF() {
    const pdfURL = `viewer/index.html?file=https://s3.amazonaws.com/obp-document-source-${env}/${this.props.uuid}.pdf&search=${constructViewerQuery(this.props.searchReducer.activeSearch, false)}`;
    window.open(pdfURL, '_blank');
    this.setState({showDocument: true});
  }

  render() {

    // Find out if the tags are active by comparing the id saved on the state saved to the
    // id of the current element
    const isActiveTags = this.props.termsReducer.activeTerms && this.props.termsReducer.activeTerms.id === this.props.id;
    const docHandle = this.props.handle ? "https://repository.oceanbestpractices.org/handle/" + this.props.handle : null;
    const { showCitation, showDocument } = this.state;

    var toggleClassName = isActiveTags ? 'result__button result__tag-button--is-active' : 'result__button';
    var toggleTagsIcon = isActiveTags ? 'fa fa-times' : 'fa fa-tags';
    var citationIcon = showCitation ? 'fa fa-times' : 'fa fa-quote-right';
    var toggleLabelClassName = isActiveTags ? 'result__tag-label result__tag-label--is-active' : 'result__tag-label';



    var authorList = null;
    if (this.props.author) {
      authorList = Array.isArray(this.props.author) ? this.props.author.join("; ") : [this.props.author].join(", ")
    }

    let result_title;

    if ( docHandle ) {
      result_title = (
        <h3 className="result__title">
          <Superlink to={docHandle} class_name="result__link" target="_blank" event_category="results" event_action="link | title" event_label={this.props.title}>
            {this.props.title}
          </Superlink>
        </h3>
      );
    } else {
      result_title = <h3 className="result__title">{this.props.title}</h3>;
    }

    //Don't show Generate Citation button if no citation available
    let citation_button = null;
    if (this.props.citation){
      citation_button = (
        <Superlink event_category="citation" event_action={`link | ${showCitation ? 'clear' : 'view'}`} event_label={showCitation ? 'Viewing Citation' : 'View Citation'}>
          <button className={`result__button result__button-secondary ${this.state.showCitation ? 'is-active': null}`} onClick={() => this.setState({ showCitation: !showCitation})} >
            <span className="result__button-icon"><i className={citationIcon} aria-hidden="true"></i></span>
            <span>{this.state.showCitation ? 'Citation Generated!': 'Generate Citation'}</span>
          </button>
        </Superlink>
      )
    }
    //Don't show Explore Document button if no PDF available (that's what the sourceKey returns. a file name if PDF or "" if not a PDF)
    let document_button = null;
    if (this.props.sourceKey && !(this.props.sourceKey === "")) {
      document_button = (
        <Superlink event_category="explore-document" event_action={`link | ${showDocument ? 'clear' : 'view'}`} event_label={showDocument ? 'Exploring Document' : 'Explore Document'}>
          <button target="_blank" className="result__button result__button-secondary" onClick={this.launchPDF.bind(this)} >
            <span className="result__button-icon"><i className="fa fa-file-pdf-o" aria-hidden="false"></i></span>
            <span>Explore Document</span>
          </button>
        </Superlink>
      )
    }
    return (

        <article className="result">
          <section className="result__info">
            <div className="result__tags">
              <span className="result__tag">{this.props.date}</span>
              {
                this.props.language
                ? <span className="result__tag">{this.props.language}</span>
                : null
              }
            </div>
            { result_title }
            <div className="result__journal_author">
              {
                this.props.journal_title
                ? <span className="result__journal-title">{this.props.journal_title}</span>
                : null
              }
              {
                 authorList
                 ? <span className="result__author">{ this.props.journal_title ? ", " + authorList : authorList }</span>
                 : null
              }
            </div>
            <div className="result__highlight"> { this.componentListFromStrings(this.props.highlight) } </div>
            <div className="result__publisher">

              <Superlink event_category="results" event_action={`link | ${isActiveTags ? 'clear' : 'view'}`} event_label={isActiveTags ? 'Viewing Tags' : 'View Tags'}>
                <a className={toggleClassName} onClick={isActiveTags ? this.onReset.bind(this) : this.handleTagToggle.bind(this)} href="#tagSection">
                  <span className="result__button-icon"><i className={toggleTagsIcon} aria-hidden="true"></i></span>
                  <span className={toggleLabelClassName}></span>
                </a>
              </Superlink>
              {document_button}
              {citation_button}
              <span className="result__publisher-data">{this.props.publisher}</span>
            </div>
            { showCitation
                ? <Citation citation={this.props.citation}/>
                : null
            }
          </section>
        </article>

    );
  }
}

export default connect(state => state)(Result);
