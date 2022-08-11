import React, { Component } from "react";
import YouTube from 'react-youtube';
import FullScreenModal from './FullScreenModal';
import SearchTipsModalItem from './SearchTipsModalItem';

import MetadataFilters from '../../images/SearchTips/MetadataFilter.png';
import SDGSearch from '../../images/SearchTips/SDGSearch.png'
import AdvancedSearch from '../../images/SearchTips/AdvancedFilter.png';
import LogicalOperators from '../../images/SearchTips/LogicalOperators.png';

import PDFViewer from '../../images/SearchTips/PDFViewer.png';
import PDFBar from '../../images/SearchTips/PDFBar.jpg';
import Tags1 from '../../images/SearchTips/Tags-1.png';
import Tags2 from '../../images/SearchTips/Tags-2.png';

import IndexingSearch from '../../images/SearchTips/IndexingSearch.png';

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
      maxWidth: '100%',
      height: 'auto',
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
              <div className="col-8">
                <div className='tip__modal-item'>
                  <h1 className="tips__modal-table-of-cotents-header"><span className="blue">Repository Search Tips</span></h1>
                  <div className='tips__modal-table-of-contents-body'>
                    <ol>
                      <li>Content indexing for your search </li>
                      <li>Performing a Basic Search</li>
                      <li>Metadata Field Search</li>
                      <ol type="a">
                        <li>Adoption Level</li>
                        <li>DOI</li>
                        <li>Endorsed</li>
                        <li>SDG</li>
                        <li>Variables : EOV/EBV/ECV</li>
                      </ol>
                      <li>‘Scoring’ Search Results</li>
                      <li>Logical Operators (Boolean AND, OR, NOT)</li>
                      <li>Search Filter Options</li>
                      <ol type="a">
                        <li>Synonyms</li>
                        <li>Refereed</li>
                        <li>Endorsed</li>
                      </ol>
                      <li>Interacting with your search results</li>
                      <ol type="a">
                        <li>Sorting</li>
                        <li>Citation Export</li>
                        <li>Saved Search</li>
                        <li>Viewing and downloading documents</li>
                      </ol>
                      <li>Vocabularies - automated semantic indexing</li>
                      <ol type="a">
                        <li>Using tags</li>
                      </ol>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
            <div className="row" id="UsingTags">
              <div className="col-8">
                <SearchTipsModalItem
                  number='1'
                  header='Content indexing for your search'
                  content='To underpin the search functions offered in the Ocean Best Practices System Repository, rich metadata input and sophisticated automated semantic indexing technology using authorized vocabularies is executed for each document uploaded.'
                />
              </div>
              <div className="col-4 tip__modal-item-screenshot">
                <img src={IndexingSearch} alt='Logical Operators Screenshot' />
              </div>
            </div>
            <div className="row" id="UsingTags">
              <div className="col-8">
                <SearchTipsModalItem
                  number='2'
                  header='Performing a basic search'
                />
                <p>The most basic search is to use the search box with <span className="blue">All Fields</span> selected, which will search across all metadata fields
                  content and the full text document. To search for a word or phrase, type it out in the search bar and press ‘Enter’
                  on your keyboard or click the search/magnifying glass Q icon or click  the box labelled ‘Search’   A list of results
                  will be displayed in a new screen including your query text in a bubble below the search bar. You can add more terms
                  or phrases to refine your search by entering them in the search bar above your results and hitting enter or clicking
                  the search/magnifying glass Q icon to refresh your results. You can choose to make your second term search in another
                  metadata field (<i>see Tip 3</i>). Additions will appear in new bubbles and you&apos;ll have the option to further refine
                  your search with logical operators  (Boolean) (<i>see Tip 4</i>). You can remove any term or phrase from the search by
                  clicking the &apos;x&apos; in its bubble, which will refresh the results. Further:</p>
                <ul>
                  <li>Searches are not case sensitive</li>
                  <li>Partial matches will be included in the results (e.g. a query like “mangroves” will also retrieve “mangrove”)</li>
                  <li>On the first search screen you will likely see suggested terms and phrases appear as you enter your query: these are terms that are present in the ontologies, thesauri, and vocabularies that we use to index documents and are there to help you build a query. (you can choose to select a suggested term or ignore it.)</li>
                </ul>
              </div>
            </div>
            <div className="row" id="UsingTags">
              <div className="col-8">
                <SearchTipsModalItem
                  number='3'
                  header='Metadata field search'
                  content=''
                />
                <p>You can restrict your search to a single metadata field – such as the <span className="blue">Title</span>, <span className="blue">Author</span>, or <span className="blue">Journal</span> of a document - by using the dropdown menu to the left of the search bar.</p>
                <p>You can also restrict your search to the body of the document in the repository, ignoring the content
                  of the metadata fields, using the same dropdown menu and selecting “<span className="blue">Document Body</span>”.</p>
                <p><strong><i>Example:</i></strong> Selecting the &quot;<span className="blue">Author</span>&quot; field and then running a search for “Delauney” will only retrieve
                  documents with “Delauney” in the &quot;Author&quot; metadata field. The search will not return results where
                  “Delauney” is only present in the body of a document (e.g. its references section).</p>
                <p><strong>Note:</strong> After you’ve conducted a search, and want a completely new search, you need to click the <span className="blue">Clear All</span> button in
                  the search bar area or click on ’x’ in each of the search bubbles.. If this is not done your new search will only be looking in the results
                  of your previous search. </p>

                <p> Some metadata field searches require that the search term corresponds to pre-selected parameters e.g. SDG requires the goal, target
                  or indicator number 14.1; Adoption Level, DOI</p>
                <h4>Adoption Level search field</h4>
                <p>Search using one of the predetermined adoption levels that have been selected at the metadata submission:</p>

                <table className="tip__modal-item-table">
                  <tr><td><u><b>Enter one of these terms to search</b></u></td><td></td></tr>
                  <tr><td>Novel</td><td>(no adoption outside originators)</td></tr>
                  <tr><td>Validated</td><td>(tested by third parties)</td></tr>
                  <tr><td>Organisational</td><td></td></tr>
                  <tr><td>Multi-organisational</td><td></td></tr>
                  <tr><td>National</td><td></td></tr>
                  <tr><td>International</td><td></td></tr>
                </table>
                <br></br>
                <h4>DOI: Digital Object Identifier</h4>
                <p>Select the <span className="blue">DOI</span> Search parameter from the dropdown by the search bar and the enter the exact DOI you wish to search for in the
                  format 10.25607/OBP-561</p>
                <h4>Endorsed search field</h4>
                <p>There are a number of ways to search for endorsed practices</p>
                <ol type="a" className="tip__modal-item-list-spaced">
                  <li>To search in this field you must know the name of the Endorsing entity for the moment enter only GOOS<br /><br />OR</li>
                  <li>Search in <span className="blue">All Fields</span> for the topic e.g. nutrients, and in the Filter Option box, toggle ON ‘Endorsed’ - all records on the search results screen  will be records where the metadata field Endorsement (External) has been completed<br /><br />OR</li>
                  <li>Search in <span className="blue">All Fields</span> for the topic e.g. nutrients, and on the results screen  use the Sort dropdown and click on ‘Endorsed’ either asc or desc. the results at the top of the display will be the records where the metadata field Endorsement (External) has been completed but there will be no indication of how many of the top records are in the category</li>
                </ol>

                <h4>SDG: Sustainable Development Goals search field</h4>
                <p>To search this field you must enter the number of the SDG Goal/Target/Indicator e.g. 14.1</p>


                <div className='col-4 tip__modal-item-screenshot'>
                  <img className='tips__modal-item-screenshot-SDGSearch' src={SDGSearch} alt='Metadata Filters Screenshot' />
                </div>
                <h4>Variables: EOV/EBV/ECV</h4>
                <p>These fields require you to search for the name of the variable e.g. ocean sound.  You can use a significant word  from the variable name in
                  the field BUT it much reduces your research results.</p>
              </div>

              <div className='col-4 tip__modal-item-screenshot'>
                <img src={MetadataFilters} alt='Metadata Filters Screenshot' />
              </div>
            </div>
            <div className="row" id="Scoring">
              <div className="col-8">
                <SearchTipsModalItem
                  number='4'
                  header='Scoring search results'
                  content='It is not  always easy to understand what results have been returned for your search. The scoring of a search result is determined 
                based on the field matches from the query you specified and any additional filters you apply to the search.
                '
                />
                <p>By default, we sort matching search results by relevance score, which measures how well each document matches a query. When
                  searching with a keyword a <i>query string</i> is constructed and used to find matching documents. A <i>query clause</i> asks the question:
                  <i> How well does this document match the query clause?</i>. Besides deciding whether or not the document matches, the query clause also
                  calculates a relevance score.
                </p>
                <p>In order to produce better search results fields such as the <i>title</i> and <i>abstract</i> are
                  boosted. Boosting a field means that the field counts more toward the relevance score. Currently the title and abstract fields are boosted
                  at double the other searchable fields.
                </p>
                <p>All searches are performed against Elasticsearch. More information about Elasticsearch relevance scoring can be
                  found at <a href='https://www.elastic.co/guide/en/elasticsearch/reference/7.16/query-filter-context.html'>Query and filter context</a></p>
                <p>When searching by a specific term - a filter option
                  is used to further narrow the search results. (<i>see Tip 5</i>). A filter option asks the simple question: <i> Does this document match the filter?</i>. The answer
                  is a simple Yes or No and no relevance score is calculated.
                </p>
              </div>
            </div>
            <div className="row" id="LogicalOperators">
              <div className="col-8">
                <SearchTipsModalItem
                  number='5'
                  header='Logical operators (Boolean AND, OR, NOT)'
                  content='Logical operators give you more control over how multiple search queries are handled.
                By default, terms or phrases entered into the search bar are used to expand your initial
                search using the &quot;OR&quot; logical operator. The operator can be switched to an “AND” operator
                by clicking on it and using the dropdown menu. “AND” operators let you restrict your search,
                only retrieving documents which include both terms or phrases. Lastly, the “NOT” operator
                allows you to exclude documents that mention a certain term or phrase.'
                />
                <p><strong>OR</strong> operators will include the term or phrase they are associated with in the search query, but
                  it may not be present in the results</p>
                <p><strong>AND</strong> operators will require that the search term IS present in the results</p>
                <p><strong>NOT</strong> operators will require that the search term IS NOT present in the results</p>

                <p><strong><i>Example:</i></strong> Searching for “marinas” from the search homepage will bring up the results
                  page, with the search bar at the top. Typing “fish” into the search bar on this results page will, by default, expand your
                  search by including documents that mention “marinas” OR “fish” . Switching the operator in front of “fish” to an “AND” will
                  restrict your search to only those documents that mention both “marinas” and “fish”. Switching the operator in front of
                  “ocean” to the “NOT” operator will exclude all documents that mention the term “fish” from your results for ‘marinas’.</p>
              </div>
              <div className="col-4 tip__modal-item-screenshot">
                <img src={LogicalOperators} alt='Logical Operators Screenshot' />
              </div>
            </div>
            <div className="row" id="AdvancedSearch">
              <div className="col-8">
                <SearchTipsModalItem
                  number='6'
                  header='Search filter options'
                  content='' />
                <p>The <span className="blue">Filter Options</span> dropdown menu on the right of the search bar allows you to access
                  additional functions to enhance your search.  Always remember to switch OFF your filter options when moving onto a new
                  search, unless you want all your searches to be filtered by the filter selected ON. </p>
                <h4>Endorsed Filter</h4>
                <p>There are a number of ways to search for endorsed practices</p>
                <ol type="a" className="tip__modal-item-list-spaced">
                  <li>Search in <span className="blue">All Fields</span> for the topic e.g. nutrients, and in the <span className="blue">Filter Option</span> box,
                    toggle ON ‘Endorsed’ - all records displayed on the search results screen  will be records where the metadata field
                    Endorsement (External) has been completed</li>
                  <li>Select <span className="blue">Endorsed</span> from the Search parameter dropdown on the left hand side of the
                    search bar. To search in this field you must know the name of the Endorsing entity for the moment enter only GOOS</li>
                  <li>Search in <span className="blue">All Fields</span> for the topic e.g. nutrients, and on the results screen
                    use the Sort dropdown and click on ‘Endorsed’ either asc or desc. the results at the top of the display will
                    be the records where the metadata field Endorsement (External) has been completed but there will be no indication
                    of how many of the top records are in the Endorsed category</li>
                </ol>
                <h4>Synonyms Filter</h4>
                <p>Enabling this feature by toggling the OFF/ON button in the <span className="blue">Filter Options</span> dropdown will allow the system to check
                  if a) your search term is present in any of the ontologies, thesauri, or vocabularies used to index documents in
                  the archive and b) if those ontologies, thesauri, or vocabularies list any exact synonyms for that term. If they
                  do, those synonyms will be added to the query to broaden your search.</p>

                <p><strong><i>Example:</i></strong> The term &quot;seamount&quot; is associated with the exact synonyms “sea mount” and “sea-mount”.
                  Allowing the system to search for these variants increases the likelihood of retrieving more
                  relevant results.
                </p>

                <h4>Refereed Filter</h4>
                <p>If you would like your search to only return results for documents that have been identified as refereed,
                  in the metadata,  you can toggle ON/OFF ‘Refereed’ in the <span className="blue">Filter Options</span> dropdown</p>
              </div>
              <div className="col-4 tip__modal-item-screenshot">
                <img src={AdvancedSearch} alt='Metadata Filters Screenshot' />
              </div>
            </div>

            <div className="row" id="AdvancedSearch">
              <div className="col-8">
                <SearchTipsModalItem
                  number='7'
                  header='Interacting with your search results'
                  content=''
                />
                <h4>Sorting</h4>
                <p>The “<span className="blue">Sort By</span>” dropdown menu on the right of the results page allows you to select in what order your results
                  will be displayed. By default, results are sorted by relevance, determined by standard metrics based
                  on the number of times your search term or phrase occurs in a target document. Selecting any other
                  sort option from the dropdown will re-sort your results.</p>
                <p>After displaying the results from your search, if you select the ‘Sort by Endorsed’ will place document records in which the Endorsement
                  (external) metadata field is completed at the top of the records displayed</p>
                <h4>Saved Search</h4>
                <p>If you wish to save a search result, simply save the URL in your browser’s address bar or add it to your bookmarks.</p>
                <h4>Citations Export</h4>
                <p>On the bar above the  search result records click ‘<span className="blue">Select All</span>’ or you can make a selection for export by clicking the small box by
                  each individual record.  After record selection a ‘<span className="blue">Download Citation</span>’ button will appear to click and export the citations to a file in your
                  nominated download location e.g. filename: obp-export-citations …   Or,  you can click the ‘<span className="blue">Generate Citation</span>’ button associated with the
                  record and copy and paste the citation into another medium.
                </p>



                <h4>Viewing and downloading documents</h4>

                <p>Clicking the “<span className="blue">Explore Document”</span> button below each search
                  result will launch a light-weight PDF viewer in a new tab.
                  With this tool you can preview the records retrieved by your
                  search as well as your search terms in context.</p>

                <p>The terms or phrases you searched for will be highlighted across the document
                  and are viewable individually (by using the dropdown menu which lists them) or
                  all together by clicking on “Highlight All Terms”.</p>

                <h4>PDF Toolbar</h4>
                <img src={PDFBar} style={imgStyle} alt="Toolbar for printing, zooming, saving PDF documents" />
                <p>You can download or print the full document using the options in the ribbon at the top of the
                  page. When you are finished, simply close the preview tab in your browser and return to your
                  search results.</p>
                <p><strong>Note:</strong> if you wish to see the complete record and metadata of any search
                  result, please click the document title to be redirected to the Ocean Best Practices
                  repository where you can also download the full document</p>
              </div>
              <div className="col-4 tip__modal-item-screenshot">
                <img src={PDFViewer} alt='Screenshot of our custom PDF Viewer' />
              </div>
            </div>

            <div className="row" id="AdvancedSearch">
              <div className="col-8">
                <SearchTipsModalItem
                  number='8'
                  header='Vocabularies - automated semantic indexing'
                />
                <h4>Using tags</h4>
                <p>Based on their textual content, each document in the Ocean Best Practices System
                  repository will have been automatically semantically indexed ("tagged") with
                  terms from controlled vocabularies and/or ontologies. You can see which tags
                  are associated with each document by clicking on "<span className="blue">View Tags"</span> in any search
                  result and these will be displayed on the left hand side-bar.</p>

                <p> You can click on any one of these tags to discover related keywords, categorized
                  by how they are related to the original tag. By clicking the checkbox next to any
                  tag, you can add it to your search, restricting results to documents that mention it.</p>
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
