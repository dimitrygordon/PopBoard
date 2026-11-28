// Stellar Life Cycle VR: page chrome (the Back button), same pattern as Night Sky.
import { forwardStudyQuery } from "../board-return.js?v=20261022a";
document.getElementById("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  forwardStudyQuery(location.search);
  location.href = "study.html" + location.search;   // same as every study page: the gallery reads its own params
});
