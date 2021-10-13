import React, { Component } from "react";
import logo from '../../images/iode-logo-footer.png';
import FullScreenModal from './FullScreenModal';
import PoweredByE84 from '../../images/PoweredByE84.svg';
import FooterLinks from './FooterLinks';
import Superlink from './Superlink';

class Footer extends Component {

  render() {

    let footer_links = null;

    if ( this.props.footerLinks ) {
      footer_links = <FooterLinks />
    }

    return (
      <footer className="footer">
        <section className="footer__info">
          <span><img className="footer__logo"src={logo} alt="IODE Logo"/></span>
          <span className="footer__text">&copy; {(new Date().getFullYear())}. UNESCO/IOC Project office for <a className="footer__link" href="https://www.iode.org">IODE</a> Oostende, Belgium.</span>

        </section>

        <section className="footer__credits">
          <Superlink to="https://element84.com" target="_blank" event_category="footer" event_action="link" event_label="Powered by Element 84">
            <img src={PoweredByE84} alt="Powered by Element 84" />
          </Superlink>
        </section>

        <section className='footer__legal'>
        { footer_links }
        <div className='footer-links'>
            <span>
              <FullScreenModal modalCTA='Disclaimer' modalTitle='Disclaimer' modalClass='footer-modal' location="footer">
                <div className='disclaimer'>
                  <strong>Disclaimer:</strong> IODE/IOC does not warrant that the information, documents and materials contained in the OceanBestPractices repository website is complete and correct and shall not be liable whatsoever for any damages incurred as a result of its use.
                  <br /><br /> <em>Mention of a commercial company or product within this repository content does not constitute an endorsement by IODE/IOC. Use of information from this repository for publicity or advertising purposes concerning proprietary products or the tests of such products is not authorized.</em>
                </div>
              </FullScreenModal>
            </span>
          </div>
        </section>
      </footer>
    );

  }

}

export default Footer;
