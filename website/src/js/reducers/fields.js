import {
  SET_ACTIVE_FIELDS,
} from '../types/fields';

const initialState = [
  {
    title: 'All Fields',
    id: 'all',
    default: true,
    active_search: true,
    autocomplete: true,
    help_text: 'Enter any term or phrase and the search will look in ALL metadata fields AND the full text document',
    value: [
      '*'
    ],
  },
  {
    title: 'Author',
    id: 'author',
    value: [
      'dc_contributor_author',
      'dc_contributor_corpauthor',
      'dc_contributor_editor',
    ],
    active_search: false,
    help_text: 'Enter the <b>author name</b>. You can enter just the surname if it is not a common name otherwise eg.  Johannes Karstensen or if you know more than one author  Karstensen Pearlman',
  },
  {
    title: 'Title',
    id: 'title',
    value: [
      'dc_title',
      'dc_title_alternative',
    ],
    active_search: false,
    autocomplete: true,
    help_text: 'Enter if possible at least the first five words of the <b>title</b> (try all title if you have it)',
  },
  {
    title: 'Endorsed',
    id: 'endorsed',
    value: [
      'obps_endorsementExternal_externalEndorsedBy'
    ],
    active_search: false,
    autocomplete: false,
    help_text: 'Enter the name of the <b>Endorsing Group</b> eg. GOOS'
  },
  {
    title: 'EOV',
    id: 'eov',
    value: [
      'dc_description_eov',
    ],
    active_search: false,
    help_text: 'Search for the <b>full name of the EOV</b> eg. Zooplankton biomass and diversity',
  },
  {
    title: 'SDG',
    id: 'sdg',
    value: [
      'dc_description_sdg',
    ],
    active_search: false,
    help_text: 'Search for the number of the <b>Sustainable Development Goal</b> eg.  14.1',
  },
  {
    title: 'Document Body',
    id: 'content',
    value: [
      'bitstreamText',
    ],
    active_search: false,
    autocomplete: true,
    help_text: 'Enter any term or phrase and the search will look in ONLY the full text of the document',
  },
  {
    title: 'Journal',
    id: 'journal',
    value: [
      'dc_bibliographicCitation_title',
    ],
    active_search: false,
    help_text: 'Search for the full title of the journal or a significant word/s   eg. Methods',
  },
  {
    title: 'Issuing Agency',
    id: 'publisher',
    value: [
      'dc_publisher',
    ],
    active_search: false,
    help_text: 'Enter the full name of the issuing agency/publisher',
  },
  {
    title: 'DOI',
    id: 'doi',
    value: [
      'dc_identifier_doi',
    ],
    active_search: false,
    help_text: 'Enter the  DOI number  eg. 10.2788/4295',
  },
  {
    title: 'ECV',
    id: 'ecv',
    value: [
      'dc_description_ecv',
    ],
    active_search: false,
    help_text: 'Search for the <b>full name of the ECV</b> eg.  Aerosols',
  },
  {
    title: 'EBV',
    id: 'ebv',
    value: [
      'dc_description_ebv',
    ],
    active_search: false,
    help_text: 'Search for the <b>full name of the EBV</b> eg.  Ecosystem Vertical Profile',
  },
  {
    title: 'Funders',
    id: 'funders',
    value: [
      'dc_description_sponsorship',
    ],
    active_search: false,
    help_text: 'Search for the <b>Funders/Sponsors name</b> eg. European Commission'
  },
  {
    title: 'Adoption Level',
    id: 'adoption',
    value: [
      'dc_description_adoption',
    ],
    active_search: false,
    help_text: 'Search for the following <b>Adoption terms</b>: Novel (no adoption outside originators); Validated (tested by third parties); Organizational; Multi-Organizational; National; International'
  }
];

export default (state = initialState, action) => {
  const existingState = Array.isArray(state) ? state : [];

  // Set up a new array with new object instances

  const fields = existingState.map((field) => ({ ...field }));

  switch (action.type) {
    case SET_ACTIVE_FIELDS:

      return fields.map((field) => {
        const returnField = field;

        returnField.active_search = false;

        if (action.field_id && action.field_id === field.id) {
          returnField.active_search = true;
        }

        return returnField;
      });

    default:

      return fields;
  }
};
