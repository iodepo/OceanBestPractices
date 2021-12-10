import got from 'got';
import pMap from 'p-map';
import { httpsOptions } from '../../lib/got-utils';

interface SynonymsResponseBody {
  results: {
    bindings: [
      {
        annotatedPropertyLabel?: {
          value: string
        },
        annotatedTarget: {
          value: string
        }
        sameAsLabel?: {
          value: string
        }
      }
    ]
  }
}

// TODO: This will need to be dynamic and fetched from S3.
const buildSynonymsQuery = (term: string): string => `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
               PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \
               PREFIX owl: <http://www.w3.org/2002/07/owl#> \
               PREFIX skos:<http://www.w3.org/2004/02/skos/core#> \
               SELECT DISTINCT ?annotatedTarget ?annotatedPropertyLabel ?sameAsLabel \
               WHERE { \
                { \
                  ?nodeID owl:annotatedSource ?xs . \
                  ?nodeID owl:annotatedProperty ?annotatedProperty . \
                  ?nodeID owl:annotatedTarget ?annotatedTarget . \
                  ?nodeID ?aaProperty ?aaPropertyTarget . \
                  OPTIONAL {?annotatedProperty rdfs:label ?annotatedPropertyLabel} . \
                  OPTIONAL {?aaProperty rdfs:label ?aaPropertyLabel} . \
                  FILTER ( isLiteral( ?annotatedTarget ) ) . \
                  FILTER ( ?aaProperty NOT IN ( owl:annotatedSource, rdf:type, owl:annotatedProperty, owl:annotatedTarget ) ) \
                  { \
                    SELECT DISTINCT ?xs WHERE { \
                      ?xs rdfs:label ?xl . \
                      FILTER (?xl = '${term}'^^xsd:string) \
                    } \
                  }\
                } \
                UNION \
                { \
                  SELECT ?sameAsLabel \
                  WHERE { \
                    ?concept skos:prefLabel ?prefLabel . \
                    FILTER (str(?prefLabel) = '${term}') \
                    ?concept owl:sameAs ?sameAsConcept . \
                    ?sameAsConcept skos:prefLabel ?sameAsLabel . \
                  } \
                } \
              }`;

// TODO: This was relatively unchanged but can use improvement.
const parseSynonymsResponse = (body: SynonymsResponseBody) => {
  const results = body.results.bindings;
  const synonyms = [];
  for (const r of results) {
    if (r['annotatedPropertyLabel'] !== undefined) {
      if (r['annotatedPropertyLabel']['value'] === 'has_exact_synonym'
        || r['annotatedPropertyLabel']['value'] === 'alternative_label') {
        synonyms.push(r['annotatedTarget']['value']);
      }
    } else if (r['sameAsLabel'] !== undefined) {
      synonyms.push(r['sameAsLabel']['value']);
    }
  }

  return synonyms;
};

export const getSynonyms = async (
  terms: string[],
  sparqlUrl: string
): Promise<string[][]> => await pMap(
  terms,
  async (t) => {
    const query = buildSynonymsQuery(t);
    const sparqlQueryResult = await got.post(
      sparqlUrl,
      {
        form: { query },
        throwHttpErrors: false,
        https: httpsOptions(sparqlUrl),
      }
    );

    return parseSynonymsResponse(JSON.parse(sparqlQueryResult.body));
  }
);
