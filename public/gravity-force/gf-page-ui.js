// Gravity Force Lab VR: page chrome (the Back button), same pattern as Night Sky and Stellar Life.
import { forwardStudyQuery } from "../board-return.js?v=20261022a";
document.getElementById("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  forwardStudyQuery(location.search);
  location.href = "study.html" + location.search;
});
