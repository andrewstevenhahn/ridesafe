var svg = d3.select("svg");

// create projection
var projection = d3.geoAlbersUsa()
    .scale(10000000000)

    var path = d3.geoPath().projection(projection);

d3.json("https://d3js.org/us-10m.v1.json", function(error, us) {
  if (error) throw error;
  var svg = d3.select("div.mapdiv")
    .append("svg")
    .attr("width", 900)
    .attr("height", 500)
  svg.append("g")
      .attr("class", "states")
    .selectAll("path")
    .data(topojson.feature(us, us.objects.states).features)
    .enter().append("path")
      .attr("d", path);

  svg.append("path")
      .attr("class", "state-borders")
      .attr("d", path(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; })));
});