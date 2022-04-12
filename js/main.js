//global variables
var keyArray = ["Total Incidents","Total Injured","Accidents Caused by Operator Error",
    "Accidents Caused by Mechanical Failure","Accidents Caused by Park Employee","gov_may_investigate","provides_records",
    "inspections","prog_type"];

//begin script when window loads
window.onload = setMap();

var expressed = keyArray[0]; //initial attribute

//chart frame dimensions
var chartWidth = window.innerWidth * 0.7
var chartHeight = 230;

//create a scale to size bars proportionally to frame
var yScale = d3.scaleLinear()
    .range([0, 40]);

//set up choropleth map
function setMap(){

    // clear default contents
    var text = d3.select("div.mapdiv")
        .html(null);

    var width = 1420;
    var height = 600;

    // create svg container for map 
    var map = d3.select("div.mapdiv")
        .append("svg")
        .attr("class","map")
        .attr("viewBox", "0 0 " + width + " " + height );
    
    // create projection
    var projection = d3.geoAlbersUsa()
        .scale(1100)
        .translate([width/2, (height/2)]);

    var path = d3.geoPath().projection(projection);
    
    //use d3.queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/state_attributes.csv") //load attributes from csv
        .defer(d3.json, "data/lower48.topojson") //load background spatial data
        .await(callback);

    function callback(error, csvData, lower48){
        var usa = topojson.feature(lower48, lower48.objects.lower48).features
        var jsonStates = lower48.objects.lower48.geometries;
        var recolorMap = colorScale(csvData);

        //loop through csv to assign each csv values to json region
        for (var i=0; i<csvData.length; i++) {		
            var csvState = csvData[i]; //the current region
            var csvAB = csvState.state_ab; //adm1 code
                
            //loop through json regions to find right region
            for (var a=0; a<jsonStates.length; a++){
                
                //where adm1 codes match, attach csv to json object		
                if (jsonStates[a].properties.STUSPS	== csvAB){
                        
                    // assign all five key/value pairs			
                    for (var key in keyArray){
                        var attr = keyArray[key];			
                        var val = parseFloat(csvState[attr]);	
                        jsonStates[a].properties[attr] = val;
                    };
                    
                    jsonStates[a].properties.name = csvState.state_ab; //set prop
                    break; //stop looking through the json regions
                };
            };
        };

        var buttonText = d3.select("#dropdownMenuLink")

        var show_total_injured = d3.select("a#injured_total")
            .on("click", function(d) {
                changeAttribute("Total Injured", csvData)
                buttonText.text("Number Reported Injured")
            });

        var show_total_reports = d3.select("a#incidents_total")
            .on("click", function(d) {
                changeAttribute("Total Incidents", csvData)
                buttonText.text("Availability of Data (Reports)")
            });

        var show_cause_mechanical = d3.select("a#cause_mechanical")
            .on("click", function(d) {
                changeAttribute("Accidents Caused by Mechanical Failure", csvData)
                buttonText.text("Accidents Caused by Mech. Failure")
            });

        var show_cause_operator = d3.select("a#cause_operator")
            .on("click", function(d) {
                changeAttribute("Accidents Caused by Operator Error", csvData)
                buttonText.text("Accidents Caused by Operator Error")
            });
        
        var cause_employee = d3.select("a#cause_employee")
            .on("click", function(d) {
                changeAttribute("Accidents Caused by Park Employee", csvData)
                buttonText.text("Accidents Caused by Park Employee")
            });

        var states = map.selectAll(".state")
            .data(usa)
            .enter()
            .append("path")
            .attr("class","state")
            .attr("id", function(d) { return d.properties.STUSPS })
            .attr("d", path)
            .style("fill", function(d) { return mapchoropleth(d, recolorMap)})
            .style("stroke", "#FFFFFF")
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)		
            .on("mousemove", moveLabel)
            .append("desc") //append the current color
            .text(function(d) {
            	return mapchoropleth(d, recolorMap);			 	
            });

        var chartTitle = map.append("text")
            .attr("x", 400)
            .attr("y", 30)
            .attr("class", "chartTitle")
            .text("Number of " + expressed + " in Each State");
        
        setBars(csvData, colorScale);
    };
};



function colorScale(csvData){
    //create quantile classes with color scale
    var color = d3.scaleQuantize() //designate quantile scale generator
    	.range([
    		"#f6e8c3",
    		"#dfc27d",
    		"#bf812d",
    		"#8c510a",
    		"#543005"
    		]);
        
    	//build array of all currently expressed values for input domain
    	var domainArray = [];
    	for (var i in csvData){
    		domainArray.push(Number(csvData[i][expressed]));
    	};
    	//pass array of expressed values as domain
    	color.domain(domainArray);

    	return color;	 //return the color scale generator
};

function mapchoropleth(d, recolorMap){

    //get data value
    var value = d.properties[expressed];
    //if value exists, assign it a color; otherwise assign gray
    if (value) {
        return recolorMap(value);
    } else {
        return "#c7eae5"
    };
};

function barchoropleth(d, recolorMap){

    //get data value
    var value = d[expressed];
    //if value exists, assign it a color; otherwise assign gray
    if (value) {
        return recolorMap(value);
    } else {
        return "#c7eae5"
    };
};

function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;
    newTitle = d3.select(".chartTitle")
        .text("Number of " + expressed + " in Each State");
  
    //recolor the map
    d3.selectAll(".state") //select every region
        .style("fill", function(d) { //color enumeration units
            return mapchoropleth(d, colorScale(csvData));
        })
        .select("desc") //replace the color text in each desc element
            .text(function(d) {
        	    return mapchoropleth(d, colorScale(csvData)); //->
            });
    
    //re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bar")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        });
    updateBars(bars,csvData,colorScale)
};

function getMaxExpressed(csvData, expressed) {
    max = 0;
    for (var i in csvData) {
        if (csvData[i][expressed] > max) {
            max = csvData[i][expressed]
        }
    }
    return max
};

function updateBars(bars, csvData, colorScale) {
    bars.sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("x", function(d, i){
            return i * (chartWidth / csvData.length-1);
        })
        .attr("height", function(d){
            max = getMaxExpressed(csvData, expressed)
            scale = yScale.domain([0, max])
            return (scale(parseFloat(d[expressed]))) * .75;
        })
        .attr("y", function(d){
            max = getMaxExpressed(csvData, expressed)
            scale = yScale.domain([0, max])
            return chartHeight - scale(parseFloat(d[expressed]))* .75 - 25;
        })
        .style("fill", function(d) { return barchoropleth(d, colorScale(csvData))})   
};

function updateLabels(labels, csvData) {
    labels.sort(function(a,b){
        return b[expressed]-a[expressed]
        })
        .attr("x", function(d, i){
            return i * (chartWidth / csvData.length)+9;
        })
        .text(function(d){
            return d.state_ab;
        })
        .style("font-size", ".8em");
}

function highlight(data){
	
	var props = data.properties; //json properties

    d3.select("#"+props.name) //select the current region in the DOM
        .style("fill", "#000000"); //set the enumeration unit fill to black
    	
    var labelAttribute = "<p>"+props[expressed] + " Known " + expressed+" in " + props.name +".</p>"; //label content
    
    //create info label div
    var infolabel = d3.select("body").append("div")
        .style("position", "absolute")
    	.attr("class", "infolabel") //for styling label
    	.attr("id", props.name+"label") //for label div
    	.html(labelAttribute) //add text

    //change barstroke
    var selectedBar = d3.selectAll(".bar." + props.name)
        .style("stroke", "#000")
        .style("stroke-width", "2");
    };

function dehighlight(data){

	//json or csv properties
	var props = data.properties; //json properties
	var region = d3.select("#"+props.name); //select the current region
	var fillcolor = region.select("desc").text(); //access original color from desc
	region.style("fill", fillcolor); //reset enumeration unit to orginal color

	d3.select("#"+props.name+"label").remove(); //remove info label

    //change barstroke
    var selectedBar = d3.selectAll(".bar." + props.name)
        .style("stroke-width", "0");
};

function moveLabel() {
	
	var x = d3.event.pageX+20; //horizontal label coordinate
	var y = d3.event.pageY-1000; //vertical label coordinate
	
	d3.select(".infolabel") //select the label div for moving
		.style("margin-left", x+ "px") //reposition label horizontal
		.style("margin-top", y+"px"); //reposition label vertical
};

function setBars(csvData, colorScale){
    var defaultText = d3.select("div.bardiv")
        .html(null);
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.7,
        chartHeight = 230;

    //create a second svg element to hold the bar chart
    var barchart = d3.select("div.bardiv")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "bars");

    var bars = barchart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar "+d.state_ab
        })
        .attr("width", chartWidth / csvData.length - 1)
    updateBars(bars,csvData,colorScale);

    //annotate bars with attribute value text
    var labels = barchart.selectAll(".labels")
        .data(csvData)
        .enter()
        .append("text")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "labels " + d.state_ab;
        })
        .attr("text-anchor", "middle")
        .attr("y", 220)
    updateLabels(labels, csvData);
    
};