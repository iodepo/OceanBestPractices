import React, { Component } from "react";
import { connect } from 'react-redux';
import Superlink from './Superlink';

var fileDownload = require('js-file-download');

class TaggerResults extends Component {
  
  constructor(props) {
    super(props);

    this.handleDownload = this.handleDownload.bind(this);
  }
  
  handleDownload(data, fileName, mime) {
    let dataToWrite = data;
    if(mime !== 'text/csv') {
      dataToWrite = JSON.stringify(data, null, " ");
    }
    fileDownload(dataToWrite, fileName, mime);
  }

  render() {

    let results = this.props.results !== undefined ? this.props.results : []
    let resultsCSV = this.props.resultsCSV !== undefined ? this.props.resultsCSV : []
    
    let downloadJSON = (
      results
        ?
        (
          <button className="button tagger__submit-button" onClick={() => this.handleDownload(results, 'JSON_Tagger_Results.json', 'application/json')}>Download JSON</button>
        )
        :
        true
    )
    
    let downloadCSV = (
      resultsCSV || this.props.taggerReducer.csvLoading || this.props.taggerReducer.csvErrored
        ?
        (
          <button className="button tagger__submit-button" onClick={() => this.handleDownload(resultsCSV, 'CSV_Tagger_Results.csv', 'text/csv')}>Download CSV</button>
        )
        :
        true
    )

    let tableRows = results.map((result) => {
      return (
        <tr key={result.uri} className='tagger-results__table--row'>
          <td className='tagger-results__table--row-data'>{result.label}</td>
          <td className='tagger-results__table--row-data'>
            <Superlink to={result.uri} target='_blank'>{result.uri}</Superlink>
          </td>
          <td className='tagger-results__tablerow-data'>{result.source_terminology}</td>
        </tr>
      );
    });

    return (
      <div>
        <table className='tagger-results__table'>
          <tbody>
            <tr className='tagger-results__table--header-row'>
              <th className='tagger-results__table--header-data'>Label</th>
              <th className='tagger-results__table--header-data'>URI</th>
              <th className='tagger-results__table--header-data'>Source Terminology</th>
            </tr>
            {tableRows}
          </tbody>
        </table>
        <span className="tagger-results__button-container">
          {downloadJSON}
          {downloadCSV}
        </span>
      </div>
    );
  }

}

export default connect(state => state)(TaggerResults);
