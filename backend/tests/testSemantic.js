import { searchSemanticScholar }
from "../retrieval/semanticScholarAgent.js";

const query = "transformers in NLP";

const papers =
  await searchSemanticScholar(query);

console.log("\nTOTAL PAPERS:", papers.length);

for (const paper of papers.slice(0, 5)) {

  console.log("\n---------------------");

  console.log("TITLE:");
  console.log(paper.title);

  console.log("\nYEAR:");
  console.log(paper.published_date);

  console.log("\nCITATIONS:");
  console.log(paper.citation_count);

  console.log("\nINFLUENTIAL CITATIONS:");
  console.log(
    paper.influential_citation_count
  );

  console.log("\nREFERENCE COUNT:");
  console.log(
    paper.reference_count
  );

  console.log("\nVENUE:");
  console.log(
    paper.venue
  );

  console.log("\nURL:");
  console.log(
    paper.url
  );

  console.log("\nABSTRACT:");
  console.log(
    (paper.snippet || "")
      .substring(0, 250)
  );
}