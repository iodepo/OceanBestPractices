import React, { Component } from "react";

class Disclaimer extends Component {
  render() {
    return (
      <section className="disclaimer">
        <div className="disclaimer__text">
          <p>
            <strong>Disclaimer:</strong>
            {' The information, data, statements, geographical boundaries, maps and declarations '}
            {'expressed in documents and objects in this repository do not imply the official '}
            {'endorsement or acceptance by UNESCO/IOC-IODE.'}
          </p>
          <p>
            {'UNESCO/IOC-IODE does not warrant that the information, documents and materials '}
            {'contained in the OceanBestPractices repository and website is complete and correct '}
            {'and shall not be liable whatsoever for any damages incurred as a result of its use. '}
            {'Contributors to this repository are solely responsible for the contents of their uploaded documents.'}
          </p>
          <p>
            <i>
              {'Mention of a commercial company or product within this repository content does not '}
              {'constitute an endorsement by UNESCO/IOC-IODE. Use of information from this repository for '}
              {'publicity or advertising purposes concerning proprietary products or the tests of such '}
              {'products is not authorized.'}
            </i>
          </p>
        </div>
      </section>
    );
  }
}

export default Disclaimer;