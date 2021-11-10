import React, { Component } from "react";
import YouTube from 'react-youtube';
import FullScreenModal from './FullScreenModal';
import SearchTipsModalItem from './SearchTipsModalItem';

import MetadataFilters from '../../images/SearchTips/MetadataFilter.png';
import AdvancedSearch from '../../images/SearchTips/AdvancedFilter.png';
import LogicalOperators from '../../images/SearchTips/LogicalOperators.png';

import PDFViewer from '../../images/SearchTips/PDFViewer.png';
import PDFBar from '../../images/SearchTips/PDFBar.jpg';
import Tags1 from '../../images/SearchTips/Tags-1.png';
import Tags2 from '../../images/SearchTips/Tags-2.png';

class SearchTipsModal extends Component {
  constructor(props) {
    super(props);

    this.call = props.call;
    this.location = props.location;
    this.hoverText = props.hoverText;
  }

  render() {
    
    const opts = {
      playerVars: { // https://developers.google.com/youtube/player_parameters
        autoplay: 0,
        controls: 1
      }
    };
    
    //add the youtube video ID to render the youtube video (will not work locally without changing to https due to how youtube handles it's embedded elements)
    let youtubeVideoID = '';
    let youtubeTutorial = youtubeVideoID ?
    (
      <div className="row" id="AdvancedSearch">
        <div>
          <SearchTipsModalItem
            number='8'
            header='Video Tutorial'
          />
            <YouTube
              videoID={youtubeVideoID}
              opts={opts}
            />
          
        </div>
      </div>
    )
    :
    true;

    const imgStyle = {
      maxWidth:'100%',
      height:'auto',
    };

    return (
    <FullScreenModal 
      modalCTA={this.call}
      modalTitle='Search Tips'
      modalClass='tip'
      location={this.location}
      hoverText={this.hoverText}
    >
      <div className='tip__modal'>
        <div className='tip__modal-body' ref={this.modalBody}>


        <div className="row" id="UsingTags">
          <div className="col-12">
            <SearchTipsModalItem
              number='1'
              header='Performing a basic search'
              content='To search for a word or phrase, type it out in the search bar and click search or hit enter. A list of results will be displayed, as well as your query text in a bubble below the search bar. You can add more terms or phrases to refine your search by entering them in the search bar above your results and hitting enter or clicking the search/magnifying glass icon to refresh your results. Additions will appear in new bubbles and you&apos;ll have the option to further refine your search with logical operators (see below). You can remove any term or phrase from the search by clicking the &apos;x&apos; in its bubble, which will refresh the results. Further:'
            />
            <ul>
              <li>Searches are not case sensitive</li>
              <li>Partial matches will be included in the results (e.g. a query like “mangroves” will also retrieve “mangrove”)</li>
              <li>You will likely see suggested terms and phrases appear as you enter your query: these are terms that are present in the
          ontologies, thesauri, and vocabularies that we use to index documents and are there to help you build a query.</li>
            </ul>

            <p>When your results are displayed, the search bar will still be present at the top of the page. You can enter more terms or phrases into the
bar to refine your search. You can change how new terms or phrases relate to your original query using logical operators <strong><i>(see Tip 3)</i></strong>.</p>
      
              
            </div>
        </div>
        <div className="row" id="UsingTags">
            <div className="col-8">
              <SearchTipsModalItem
                number='2'
                header='Searching by metadata field'
                content='You can restrict your search to a single metadata field – such as the Title, Author, or Issuing Agency of a document - by using the dropdown
                menu to the left of the search bar.'
              />
                <p>You can also restrict your search to the body of documents in the archive, ignoring the content
                of the metadata fields, using the same dropdown menu and selecting “Document Body”.</p>
                <p><strong><i>Example:</i></strong> Selecting the &quot;Author&quot; field and then running a search for “J Smith” will only retrieve
                documents with “J Smith” in the &quot;Author&quot; metadata field. The search will not return results where
                “J Smith” is only present in the body of a document (e.g. its references section).</p>
                <p><strong>Note:</strong> After you’ve conducted a search, selecting a new field from the dropdown filter will reset your results.</p>
              </div>
              <div className='col-4 tip__modal-item-screenshot'>
                <img src={MetadataFilters} alt='Metadata Filters Screenshot' />
              </div>
          </div>
          <div className="row" id="LogicalOperators">
            <div className="col-8">
              <SearchTipsModalItem
                number='3'
                header='Logical operators'
                content='Logical operators give you more control over how multiple search queries are handled.
                By default, terms or phrases entered into the search bar are used to expand your initial
                search using the &quot;OR&quot; logical operator. The operator can be switched to an “AND” operator
                by clicking on it and using the dropdown menu. “AND” operators let you restrict your search,
                only retrieving documents which include both terms or phrases. Lastly, the “NOT” operator
                allows you to exclude documents that mention a certain term or phrase.'
              />
                <p><strong>OR</strong> operators will include the term or phrase they’re associated with in the search query, but
not require that it be present in the results<br/>
                  <strong>AND</strong> operators will require that the search term IS present in the results<br/>
                  <strong>NOT</strong> operators will require that the search term IS NOT present in the results
                </p>
                <p><strong><i>Example:</i></strong> Searching for “watershed” from the oceanbestpractices.org homepage will bring up result page, with the search bar at the
top. Typing “ocean” into the search bar on this results page will, by default, expand your search by including documents that mention
“watershed” or “ocean” . Switching the operator in front of “ocean” to an “AND” will restrict your search to only those documents that
mention both “watershed” and “ocean”. Switching the operator in front of “ocean” to the “NOT” operator will exclude all documents that
mention the term “ocean” from your results.</p>
              </div>
              <div className="col-4 tip__modal-item-screenshot">
                <img src={LogicalOperators} alt='Logical Operators Screenshot' />
              </div>
          </div>

          <div className="row" id="AdvancedSearch">
            <div className="col-8">
              <SearchTipsModalItem
                number='4'
                header='Advanced search options &amp; filters'
                content='The “Advanced” dropdown menu on the right of the search bar allows you access additional functions to enhance your search.'
              />
              <h4>Synonyms</h4>
              <p>Enabling this feature by toggling the OFF/ON button will allow the system to check if a) your search
term is present in any of the ontologies, thesauri, or vocabularies used to index documents in the
archive and b) if those ontologies, thesauri, or vocabularies list any exact synonyms for that term. If
they do, those synonyms will be added to the query to broaden your search.
<br/>
<strong><i>Example:</i></strong> The term &quot;seamount&quot; is associated with the exact synonyms “sea mount” and “sea-
mount”. Allowing the system to search for these variants increases the likelihood of retrieving more,
relevant results.
</p>
                
              <h4>Refereed</h4>
              <p>If you would like your search to only return results that have been refereed, you can toggle this option on by clicking the OFF switch to
ON inside the Advanced dropdown.</p>
            </div>
            <div className="col-4 tip__modal-item-screenshot">
              <img src={AdvancedSearch} alt='Metadata Filters Screenshot' />
            </div>
          </div>

          <div className="row" id="AdvancedSearch">
            <div className="col-12">
              <SearchTipsModalItem
                number='5'
                header='Interacting with your search results'
                content=''
              />
              <h4>Sorting</h4>
              <p>The “Sort By” dropdown menu on the right of the results page allows you to select in what order your results will be displayed. By default,
                results are sorted by relevance, determined by standard metrics based on the number of times your search term or phrase occurs in a
                target document. Selecting any other sorting rule from the dropdown will resort your results.</p>
                <h4>Saved Search</h4>
                <p>If you wish to save a search result, simply save the URL in your browser’s address bar or add it to your bookmarks.</p>
                <h4>Citations</h4>
                <p>Clicking on the “Generate Citation” button associated with each search result will display the record citation and allow you to copy and
paste it into another medium. In the future, we plan to offer more formatting options for citations including EndNote, BibTex, METS, and
XML.</p>
            </div>
          </div>

          <div className="row" id="AdvancedSearch">
            <div className="col-8">
              <SearchTipsModalItem
                number='6'
                header='Viewing and downloading documents'
                content='Clicking the “Explore Document” button below each
                search result will launch a light-weight PDF viewer in
                a new tab. With this tool you can preview the records
                retrieved by your search as well as your search terms
                in context.'
              />
              <p>The terms or phrases you queried for will be
                highlighted across the document and are viewable
                individually (by using the dropdown menu which lists
                them) or all together by clicking on “Highlight All
                Terms”.</p>

                <h4>PDF Toolbar</h4>
                <img src={PDFBar} style={imgStyle} alt="Toolbar for printing, zooming, saving PDF documents" />
                <p>You can download or print full document using the options in the ribbon at the top of the page.
                When you’re done, simply close the preview tab in your browser and return to your search results.</p>
                <p><strong>Note:</strong> if you wish to see the complete record and metadata of any search result, please click the document title to be redirected to the Ocean Best Practices repository.</p>
            </div>
            <div className="col-4 tip__modal-item-screenshot">
              <img src={PDFViewer} alt='Screenshot of our custom PDF Viewer' />
            </div>
          </div>

          <div className="row" id="AdvancedSearch">
            <div className="col-8">
              <SearchTipsModalItem
                number='7'
                header='Using tags'
                content='Based on their textual content, each document in the ocean best practices repository has been "tagged" with terms from controlled vocabularies and/or ontologies. You can see which tags are associated with each document by clicking on "View Tags" in any search result.'
              />
              <p>The terms or phrases you queried for will be
                highlighted across the document and are viewable
                individually (by using the dropdown menu which lists
                them) or all together by clicking on “Highlight All
                Terms”.</p>
                <p>You can click on any one of these tags to discover related keywords, categorized by how they are related to the original tag. By clicking the checkbox next to any tag, you can add it to your search, restricting results to documents that mention it.</p>
              
            </div>
            <div className="col-4 tip__modal-item-screenshot">
              <img src={Tags1} alt='Screenshot tags used in search' />
              <img src={Tags2} className="neg-marg-top-3" alt='Screenshot of lefthand tag selection panel' />
            </div>
          </div>
          {youtubeTutorial}
        </div>
        </div>
      </FullScreenModal>
    );
  }
}

export default SearchTipsModal;
