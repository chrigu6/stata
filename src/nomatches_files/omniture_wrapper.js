//////////////////////////////////////////////////////////////////////////////////////
// Omniture Wrapper
// Written By: Michael Johns mjohns(at)ea.com
// Date: 04/06
//
// Purpose: the following wrapper was created to abstract business names from logical
// names. This eliminates the touching of every Omniture call if for some reason the
// use of props, evars or events change. It also creates a means to select the type
// of reporting desired (custom link or Psuedo HTTP request). 
//
//////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////
// Global Variables and Array declarations
//////////////////////////////////////////////////////////////////////////////////////
var prefix 					= "s_ea.";//object name
var eventArr           				= "eventsAssignmentArray";
var addValuesArr				= "additionalValuesAssignmentArray";
var eventsAssignmentArray 			= new Array();
var propsAssignmentArray 			= new Array();
var evarsAssignmentArray 			= new Array();
var additionalValuesAssignmentArray		= new Array();
var trackingItems      				= new Array(4);
trackingItems[ 0 ]     				= "props";
trackingItems[ 1 ]     				= "evars";
trackingItems[ 2 ]     				= "events";
trackingItems[ 3 ]     				= "additionalValues";
var eventString					= "";// holds the events
var currStartMin 				= -1;//current start min for session extention
var targetMinCnt 				= -1;//target min session extention
var timerStarted 				= 0;//flag for session timing started
var basePN 					= "";//tmp var for overlays
var baseP10 					= "";//tmp var for overlays
var baseP11 					= "";//tmp var for overlays
var baseP12 					= "";//tmp var for overlays
var baseP15 					= "";//tmp var for overlays
var baseP17 					= "";//tmp var for overlays
var baseP18 					= "";//tmp var for overlays
var baseE18 					= "";//tmp var for overlays
var baseE29 					= "";//tmp var for overlays
var baseE30 					= "";//tmp var for overlays
var rsiP 					= "";//tmp var for overlays

//////////////////////////////////////////////////////////////////////////////////////
// Function setOmniValues
//
// Description: This function separates the business names from the logical
// and takes in all the possible values associated with custom links and 
// standard HTTP requests. It will populate and evaluate the params being
// passed in and map to appropriate Omniture values.
//
// link - "this" passes link object
//
// type - type of link (mandatory for custom link reporting)
// 			'o' for Custom Link
// 			'd' to include in the File Downloads report
// 			'e' to include in the Exit Links report
//
// linkName - without a Link Name, the link will be reported by URL
//
// props - list of props and values, example:
// 			'userid=prop1value,sitecode=prop2value' 
// 		 	*** never use actual param name, always the business name (userid instead of prop1)
// 			*** See omnitureMapping function for business names (*not case sensitive)
//
// evars - list of evars and values, example: 'userid=evar1value,sitecode=evar2value' 
// 		 	*** never use actual param name, always the business name (userid instead of evar1)
// 			*** See omnitureMapping function for business names (*not case sensitive)
//			*** Can handle serialized events
//
// events - list of events to trigger example:
// 			'successdownload,successregistration'
// 			*** never use actual param name, always the business name (successdownload instead of event2)
// 			*** See omnitureMapping function for business names (*not case sensitive)
//
// reportPageView - flag to report data as cutomlink (0) or a psuedo HTTP request (1)
//
// productDetails - list of products example:
// 					'categoryValue2; productName1 (id1),categoryValue2; productName2 (id2)
//
// additionalValues - used to report any additional values that need to be set example:
// 					'campaign=campaignValue,state=stateValue,zip=zipValue,cc=USD'	
// 					*** See omnitureMapping function for business names (*not case sensitive)
//
// pageName - used to override the pageName (s_ea.pageName) example:
//            'myNewPageName'
//            *** if blank or null the pageName will not change
// 
// Called By: external links
//
//////////////////////////////////////////////////////////////////////////////////////
function setOmniValues(link, type, linkName, props, evars, events, reportPageView, productDetails, additionalValues, pageName){

	// re-intialize arrays/strings
	propsAssignmentArray.length 			= 0;
	evarsAssignmentArray.length 			= 0;
	eventsAssignmentArray.length 			= 0;
	additionalValuesAssignmentArray.length		= 0;
	eventString					= "";
	
	//reinitialize object
	s_ea = s_gi(s_account);
	
	//check if pageName needs to be overridden
	if(isNotEmpty(pageName)) {
		s_ea.pageName = pageName;
		//need to update prop46
		s_ea.getPageNameSeg(pageName);
	}
	
	//check if current campaign is present and ensure
	//it is passed with all calls
	if (s_ea.prop47){
	   if(isNotEmpty(props)){
		   props += "," + eval("'currCampaign='+s_ea.prop47");
		}else{
		   props += eval("'currCampaign='+s_ea.prop47");
		}     
	}
	
	//check if link passed
	if((typeof(link) == 'undefined') || (link == null) || (!link)){
		link = "none";
	}
	          
    // put raw split data in named arrays
	// example propsAssignmentArray --> userid=prop1value,sitecode=prop2value,brand=prop3value
	for (i = 0; i<=3; i++) {
    	if(isNotEmpty(eval(trackingItems[ i ]))){
			var chunk = eval(trackingItems[ i ]);
			var currArrayName = trackingItems[ i ] + "AssignmentArray";
			eval(currArrayName + " = chunk.split(',')");
		    // split assigned values into two-dimensional array
			// DO NOT need to do anything to events since values are driven by
			// evar and events are only comma "," delimited
			if( currArrayName != eventArr){
				var currArraySegmentedName = trackingItems[ i ] + "Array";
				for (var j=0; j < eval(currArrayName).length; j++) {
					// example of currArraySegmentedName -->  userid,prop1value
					currArraySegmentedName = eval(currArrayName)[ j ].split("=");
					// convert business names to omniture names
					// example --> userid switched to prop1
					currArraySegmentedName[ 0 ] = omnitureMapping(currArraySegmentedName[ 0 ], trackingItems[ i ]);
					// swapping in array example --> userid=prop1Value becomes prop1,prop1Value
					eval(currArrayName)[ j ] = currArraySegmentedName;
					
				}
			}else{
				for (var j=0; j < eval(currArrayName).length; j++) {
					// for event array example --> successdownload set to event2
					// also builds up string of events for assignment to
					// s_ea.linkTrackEvents and s_ea.events
					// have to also check for serialized events and remove & restore
					var eventSegments = eventsAssignmentArray [j].split(":");
					var finalEvent = omnitureMapping(eventSegments[0],"events");
					
					if(typeof eventSegments[1] != 'undefined'){
						finalEvent = finalEvent + ":" + eventSegments[1];
					}
					eventString += finalEvent;
												
					if(j < eval(currArrayName).length - 1){
		 				eventString += ",";
		 			}
				}
			}
			
			// set individual variable assignment
			if( currArrayName != eventArr){
				assignValuestoParams(i);
			}
		}
	}
	
	//get events if any
	var currEvents = assignEvents(reportPageView);
		
	//assign to s_ea.linkTrackVars 
    assignLinkTrackVars(reportPageView, currEvents, productDetails);
	
	//assign to s_ea.products 
    assignProducts(reportPageView, productDetails);
		
	//call appropriate reporting function
	reportData(link, type, linkName, reportPageView);
	
};

//////////////////////////////////////////////////////////////////////////////////////
// Function omniLinkCall
//
// Description: This function reports a custom link name without changing any other
// parameters. This is equivalent to using the setOmniValues. Either method is 
// acceptable.This function also enables users to bypass the usage of the link object 
// by only passing in a custom link name as the first parameter. This function also 
// takes the last 3 segments of the pagename and puts them with the customlink name
// appended in another prop.
//
// link - "this" passes link object
//
// linkName - without a Link Name, the link will be reported by URL
//
// Called By: external links
//
//////////////////////////////////////////////////////////////////////////////////////
 function omniLinkCall(link,linkName) {

	var cLinkName = link;
		
	if(isNotEmpty(linkName)){
		cLinkName = linkName;
	}
	
	var pnStub = s_ea.getPageNameSegStrip();
	pnStub += ":" + cLinkName;
		  
	setOmniValues(link,'o',cLinkName,'smCustomLinkName='+pnStub+',pagenameseg='+pnStub+',currurl='+s_ea.prop49+',currrsi='+s_ea.prop50,'pagenameseg='+pnStub,'',0,'','');
		
};

//////////////////////////////////////////////////////////////////////////////////////
// Function assignEvents
//
// Description: Assigns new values from array to s_ea.linkTrackEvents and 
// s_ea.events variable based on the type of reporting selected. 
//
// reportPageView - flag to report data as cutomlink (0) or a psuedo HTTP request (1)
//
// returns: "None" or "events"
//
// Called By: setOmniValues
//
//////////////////////////////////////////////////////////////////////////////////////
function assignEvents(reportPageView){

	s_ea.linkTrackEvents = "None";
	s_ea.events = "";
	
	//if((reportPageView)&&(eventsAssignmentArray.length > 0)){
		//s_ea.events = eventString;
		//return "None";
	//}
	
	// Added for campaign tracking -  event 35 & 36
	if(reportPageView){
		if(eventsAssignmentArray.length > 0){
			s_ea.events = eventString + ",event35,event36";
			if(chkCamp(s_ea.prop47)){
		 		s_ea.events += ",event50";//for campaign hit
			}	
		}else{
			s_ea.events = "event35,event36";
			if(chkCamp(s_ea.prop47)){
		 		s_ea.events += ",event50";//for campaign hit
			}	
		}
		return "None";
	}
	
	if((!reportPageView)&&(eventsAssignmentArray.length > 0)){
		s_ea.linkTrackEvents = eventString;
		s_ea.events = eventString;
		return "events";
	}
	return "None";
};

//////////////////////////////////////////////////////////////////////////////////////
// function reportData
//
// Description: calls the appropriate function:
// 				s_ea.t() psuedo HTTP request or s_ea.tl() Custom Link
// to trigger the correct type of reporting
//
// link - "this" passes link object
//
// type - type of link (mandatory for custom link reporting)
// 			'o' for Custom Link
// 			'd' to include in the File Downloads report
// 			'e' to include in the Exit Links report
//
// linkName - without a Link Name, the link will be reported by URL
//
// reportPageView - flag to report data as cutomlink (0) or a psuedo HTTP request (1)
//
// Called By: setOmniValues
//
//////////////////////////////////////////////////////////////////////////////////////
function reportData(link, type, linkName, reportPageView){

	if(reportPageView){
		s_ea.pageLoad=1;
		s_ea.t();
	}else{
		linkName = s_ea.pageName+":"+linkName;//add pageName to Link Name
		if(isNotEmpty(link)){
			s_ea.tl(link, type, linkName);
		}else{
		   	s_ea.tl('', type, linkName);
		}
		
	}
};

//////////////////////////////////////////////////////////////////////////////////////
// Function assignProducts
//
// Description: sets s_ea.products to actual product data
//
// reportPageView - flag to report data as cutomlink (0) or a psuedo HTTP request (1)
//
// productDetails - string containg product details
//
// Called By: setOmniValues
//
//////////////////////////////////////////////////////////////////////////////////////
function assignProducts(reportPageView, productDetails){

	s_ea.products = "";
	
	if(isNotEmpty(productDetails)){
		s_ea.products = productDetails;
	}
};

//////////////////////////////////////////////////////////////////////////////////////
// Function assignLinkTrackVars
//
// Description: Assigns new values from arrays to s_ea.linkTrackVars variable
//
// reportPageView - flag to report data as cutomlink (0) or a psuedo HTTP request (1)
//
// currEvents - string containg "None" or "events" set by assignEvents()
//
// productDetails - string of product details passed in from link
//
// Called By: setOmniValues
//
//////////////////////////////////////////////////////////////////////////////////////
function assignLinkTrackVars(reportPageView, currEvents, productDetails){

	if(reportPageView){
		//props and evars do NOT needs to be set since s_ea.t() sends everything (props/evars)
		s_ea.linkTrackVars = "None";
		
	}else{
		var currProps 			= getLinkTrackVarsValues("propsAssignmentArray");
		var currEvars 			= getLinkTrackVarsValues("evarsAssignmentArray");
		var currAdditionalValues 	= getLinkTrackVarsValues("additionalValuesAssignmentArray");
				
		if(isNotEmpty(productDetails)){
			currProductDetails = "products";
		}else{
			currProductDetails = "None";
		}
		s_ea.linkTrackVars = buildLinkTrackVarsValues(currProps, currEvars, currAdditionalValues, currEvents, currProductDetails);
	}
};

//////////////////////////////////////////////////////////////////////////////////////
// Function buildLinkTrackVarsValues
//
// Description: compiles new values from arrays to be assigned to s_ea.linkTrackVars
// variable
//
// currProps - string of props being reported
// currEvars - string of evars being reported
// currAdditionalValues - string of aditional values being reported
// currEvents - string "None" or "events"
// currProductDetails - string "None" or "products"
//
// Called By: assignLinkTrackVars
//
// Returns: arr (aggregated array of all values for linkTrackVars)
//
//////////////////////////////////////////////////////////////////////////////////////
function buildLinkTrackVarsValues(currProps, currEvars, currAdditionalValues, currEvents, currProductDetails){
	
	var arr = new Array();
	if(currProps != "None") arr.push(currProps);
	
	if(currEvars != "None") arr.push(currEvars);
	
	if(currAdditionalValues != "None") arr.push(currAdditionalValues);
	
	if(currEvents != "None") arr.push(currEvents);
	
	if(currProductDetails != "None") arr.push(currProductDetails);
	
	if(arr.length == 0) {
		return 'None';
	} else {
		return arr.join(",");
	}
};

//////////////////////////////////////////////////////////////////////////////////////
// Function getLinkTrackVarsValues
//
// Description: pulls and assigns new values from arrays to s_ea.linkTrackVars variable 
//
// arrayName - name of array to be used to pull values from
//
// Called By: assignLinkTrackVars
//
// Returns: linkTrackVarsValues (string of all values for linkTrackVars)
//
//////////////////////////////////////////////////////////////////////////////////////
function getLinkTrackVarsValues(arrayName){

	if(eval(arrayName).length > 0){
		linkTrackVarsValues = "";
		// populate s_ea.s_linkTrackVars with array data
		for (var i=0; i < eval(arrayName).length; i++) {
		 	linkTrackVarsValues += eval(arrayName)[i][0];
		 	// need to add "," between values except last one
		 	if(i < eval(arrayName).length - 1){
		 		linkTrackVarsValues += ",";
		 	}
		}
	}else{
		linkTrackVarsValues = "None";
	}
 return linkTrackVarsValues;

};

//////////////////////////////////////////////////////////////////////////////////////
// Function assignValuestoParams
//
// Description: resolves values from array and assigns to appropriate omniture variable
//
// Called By: setOmniValues
//
//////////////////////////////////////////////////////////////////////////////////////
function assignValuestoParams(arrayPos){

	var currMultiDimArrayName = eval(trackingItems[ arrayPos ] + "AssignmentArray");
	var arrName = trackingItems[ arrayPos ] + "AssignmentArray";
		
	for (var m=0; m < currMultiDimArrayName.length; m++) {
		// assigns value to params example --> s_ea.prop1 = prop1Value
		eval(prefix + currMultiDimArrayName[m][0] + "= currMultiDimArrayName[m][1]");
	}
	
};

//////////////////////////////////////////////////////////////////////////////////////
// Function isNotEmpty
//
// Checks if the string is null or contains spaces only
//
// val - any string/array
//
// Called By: setOmniValues, assignProducts, assignLinkTrackVars
//
// Returns: true or false
//
//////////////////////////////////////////////////////////////////////////////////////
function isNotEmpty(val){

     re = /^ *$/
     if(re.exec(val)||(val == null)){
          return false;
     }else{
          return true;
     }
};

//////////////////////////////////////////////////////////////////////////////////////
// Function intSearch(searchTerm,predSearchTerm)
//
// Makes an internal search custom link call
//
// searchTerm - string the user is searching on
//
// Called By: page
//
//////////////////////////////////////////////////////////////////////////////////////
function intSearch(searchTerm,predSearchTerm){

	if(!isNotEmpty(predSearchTerm)) {
		predSearchTerm = "";
	}

	var pnStub = s_ea.getPageNameSegStrip();
	pnStub += ":intSearch";
	
	searchTerm = escape(searchTerm.toLowerCase());
	setOmniValues('','o','intSearch','intSearchTerms='+searchTerm+',predSearchSel='+predSearchTerm+',pagenameseg='+pnStub+',currurl='+s_ea.prop49+',currrsi='+s_ea.prop50,'intSearchTerms='+searchTerm+',predSearchSel='+predSearchTerm+',pagenameseg='+pnStub,'searches',0,';noProdSearch');
};

//////////////////////////////////////////////////////////////////////////////////////
// Function modifyOmniRSI
//
// updates report suite Id(s) of current page object
//
// newRSI - total string of comma separated RSIs
//
// sendBroadcast - flag to send broadcast, (0) don't send and (1) send. 
//                 If no parameter then defaults to (0), don't send
//
// Called By: page
//
//////////////////////////////////////////////////////////////////////////////////////
function modifyOmniRSI(newRSI,sendBroadcast){
	
	s_account = newRSI;
	s_ea.sa(newRSI);
	if(isNotEmpty(sendBroadcast)) {
		if(sendBroadcast){
			omniCallPage();
		}
	}
};

//////////////////////////////////////////////////////////////////////////////////////
// Function omniOverlayGlobalOn
//
// Description: manages variables and calls for global overlay
//
// pti - pageTypeId (last segment of pageName)
//				
// addRSI - optional additional RSI 
//
// p10value - optional value for prop10 (pti used if omitted)
//
// p15value - optional value for prop15
//
// successiveOverlay - optional boolean flag if overlay was preceded by another
// overlay (defaults to false - 0)
//
// Called By: page
//        
//////////////////////////////////////////////////////////////////////////////////////
function omniOverlayGlobalOn(pti,addRSI,p10value,successiveOverlay,p15value){

	var initialOverlay = 1;
	
	if(isNotEmpty(successiveOverlay)){
		if(successiveOverlay){
			initialOverlay = 0;
		 }
	}

	if(initialOverlay){
		basePN = s_ea.pageName;
		baseP10 = s_ea.prop10;
		baseP11 = s_ea.prop11;
		baseP12 = s_ea.prop12;
		baseP15 = s_ea.prop15;
		baseP17 = s_ea.prop17;
		baseP18 = s_ea.prop18;
		baseE18 = s_ea.eVar18;
		baseE29 = s_ea.eVar29;
		baseE30 = s_ea.eVar30;
		rsiP = s_account;
	}
	
	var baseGlobalPnSeg ="GLOBAL:INTL:";
	var tmpPN = "";
	var baseGlobalRSI = "eaeacom";
	
	if(isNotEmpty(addRSI)){
		baseGlobalRSI = baseGlobalRSI + "," + addRSI;
	}
				 
	s_account=omniCheckHost(baseGlobalRSI);// plus others passed in if necessary?
				 
	modifyOmniRSI(s_account,0);
								
	tmpPN =s_ea.pageName; 
	tmpPN =(tmpPN.split(':').slice(-7).join(':'));
	tmpPN = baseGlobalPnSeg + tmpPN;
	tmpPN =(tmpPN.split(':').slice(0,8).join(':'));
	tmpPN = tmpPN + ":" + pti;
				 
    if(!isNotEmpty(p10value)){
		p10value = pti;
	}
	
	if(!isNotEmpty(p15value)){
		p15value = s_ea.prop15;
	}
				 
	setOmniValues('','','','userid='+s_ea.prop1+',sitecode='+s_ea.prop2+',brand='+s_ea.prop3+',franchise='+s_ea.prop4+',game='+s_ea.prop5+',studio='+s_ea.prop7+',sitetype='+s_ea.prop9+',contenttitle='+p10value+',contentbucket='+p15value+',territory=GLOBAL,language=en_INTL,country=INTL','originalsite=INTL:'+s_ea.prop2+':'+s_ea.prop5,'',1,'','',tmpPN.toUpperCase());
};

//////////////////////////////////////////////////////////////////////////////////////
// Function omniOverlayGlobalOff
//
// Description: manages reverting variables for global overlay on close
//
// Called By: page
//        
//////////////////////////////////////////////////////////////////////////////////////
function omniOverlayGlobalOff(){
		
	s_ea.prop10 = baseP10;
	s_ea.prop11 = baseP11;
	s_ea.prop12 = baseP12;
	s_ea.prop15 = baseP15;
	s_ea.prop17 = baseP17;
	s_ea.prop18 = baseP18;
	s_ea.eVar18 = baseE18;
	s_ea.eVar29 = baseE29;
	s_ea.eVar30 = baseE30;
	s_ea.pageName = basePN;
        
 	s_account= rsiP;
	modifyOmniRSI(s_account,1);
};

//////////////////////////////////////////////////////////////////////////////////////
// Function omniOverlayOn
//
// Description: manages variables and calls for non-global overlays
//
// pti - pageTypeId (last segment of pageName)
//				
// p10value - optional value for prop10 (pti used if omitted) 
//
// sendBroadcast - optional boolean flag to send call (defaults to true - 1)
//
// successiveOverlay - optional boolean flag if overlay was preceded by another
// overlay (defaults to false - 0)
//
// p15value - optional value for prop15 
//
// Called By: page
//        
//////////////////////////////////////////////////////////////////////////////////////
function omniOverlayOn(pti,p10value,sendBroadcast,successiveOverlay,p15value){

	var initialOverlay = 1;
	
	if(isNotEmpty(successiveOverlay)){
		if(successiveOverlay){
			initialOverlay = 0;
		 }
	}
	
	if(initialOverlay){ 
		basePN = s_ea.pageName;
		baseP10 = s_ea.prop10;
		baseP15 = s_ea.prop15;
	}
					 
	if(!isNotEmpty(pti)){
		pti = "PTIMISSING";
	}
				
	if(!isNotEmpty(p10value)){
		p10value = pti;
	}
	
	if(!isNotEmpty(p15value)){
		p15value = s_ea.prop15;
	}
				 
	if(!isNotEmpty(sendBroadcast)){
		sendBroadcast = 1;
	}
				
	if(sendBroadcast){
		setOmniValues('','','','contenttitle='+p10value+',contentbucket='+p15value,'','',1,'','',omniSetPageTypeId(pti.toUpperCase()));
	}
};
	
//////////////////////////////////////////////////////////////////////////////////////
// Function omniOverlayOff
//
// Description: manages reverting variables for non-global overlay on close
//
// Called By: page
//        
//////////////////////////////////////////////////////////////////////////////////////	
function omniOverlayOff(){
		
	s_ea.prop10 = baseP10;
	s_ea.prop15 = baseP15;
	s_ea.pageName = basePN;
    omniCallPage();
};

//////////////////////////////////////////////////////////////////////////////////////
// Function omniTrackComment
//
// Description: used for comment tracking. Fires a custom link and event and
//              and event and calls custom linkoptional descriptor passed for eVar
//
// clName - custom link name 
//
// descriptor - optional value to identify the particular comment           
//
// Called By: page
//        
//////////////////////////////////////////////////////////////////////////////////////	
function omniTrackComment(clName,descriptor){

	if(isNotEmpty(clName)){
		clName = "comment_" + clName;
	}else{ 
		clName = "comment";
	}
	
	var pnStub = s_ea.getPageNameSegStrip();
	pnStub += ":" + clName;
	
	if(!isNotEmpty(descriptor)){
		setOmniValues('none','o',clName,'pagenameseg='+pnStub+',currurl='+s_ea.prop49+',currrsi='+s_ea.prop50,'pagenameseg='+pnStub,'commentMade',0,'','');
	}else{
		setOmniValues('none','o',clName,'pagenameseg='+pnStub+',currurl='+s_ea.prop49+',currrsi='+s_ea.prop50,'commentDesc='+descriptor+',pagenameseg='+pnStub,'commentMade',0,'','');
	}
	
};

//////////////////////////////////////////////////////////////////////////////////////
// Function omniCreateRetailerInfo
//
// Description: manages retailer links and builds appropriate string and fires proper
//              event and calls custom link
//
// clName - custom link name              
//
// Called By: page
//        
//////////////////////////////////////////////////////////////////////////////////////	
function omniCreateRetailerInfo(clName){
		
	var platfrm = "NONE";
	var retailerName = "NONE";
	var desc = "NONE";
				
	strArry = clName.split("_");
		
	if (typeof strArry[3] !== 'undefined' && strArry[3] !== null) {
		platfrm = strArry[3]
	}
		 
	if (typeof strArry[2] !== 'undefined' && strArry[2] !== null) {
		retailerName = strArry[2];
	}

	if (typeof strArry[4] !== 'undefined' && strArry[4] !== null) {
		desc = strArry[4]
	}
			
	if(window.s_ea.prop2){
		var gName = s_ea.prop2;
	}else{
		var gName = "NONE"
	}
	
	var pnStub = s_ea.getPageNameSegStrip();
	pnStub += ":" + clName;
				
	setOmniValues('none','o',clName,'pagenameseg='+pnStub+',currurl='+s_ea.prop49+',currrsi='+s_ea.prop50,'purchaseClickInfo='+gName+":"+platfrm+":"+retailerName+":"+desc+',pagenameseg='+pnStub,'purchaseClick',0,'','');
};

////////////////////////////////////////////////////////////////////////////////////////
// Function omnitureMapping
//
// Description: Remaps business names to omniture names or returns "notFound"
//
// currValue - current array being populated:
//				propsAssignmentArray
//				evarsAssignmentArray
//				additionalValuesAssignmentArray
//				eventsAssignmentArray
//
// typeOfValue - type of array value being passed in
//				"props"
//				"evars";
//				"events";
//				"additionalValues";
//
// Called By: setOmniValues
//
// Returns: Omniture logical value of parameter
//
//////////////////////////////////////////////////////////////////////////////////////
function omnitureMapping(currValue, typeOfValue){

	currValue = currValue.toLowerCase();
 
	var lookupTable = new Array();
	// eVars	
	if(typeOfValue == "evars"){
		lookupTable["userid"]								= "eVar1";
		lookupTable["sitecode"]						  		= "eVar2";
		lookupTable["game"]							  	= "eVar3";
		lookupTable["newslettertype"]				  			= "eVar4";
		lookupTable["intcmp"]						  		= "eVar5";
		lookupTable["registrationlevel"]			  			= "eVar6";
		lookupTable["supporteventtype"]				  			= "eVar7";
		lookupTable["downloadtype"]							= "eVar8";
		lookupTable["gamespecifictype"]							= "eVar9";
		lookupTable["registrationtype"]							= "eVar10";
		lookupTable["purchaseintentaction"]						= "eVar11";
		lookupTable["extcampaignid"]							= "eVar14";
		lookupTable["entitlementtype"]							= "eVar15";
		lookupTable["eastoreintcampaign"]						= "eVar16";
		lookupTable["country"]								= "eVar17";
		lookupTable["territory"]							= "eVar18";
		lookupTable["abtest"]								= "eVar19";
		lookupTable["intsearchterms"]							= "eVar20";
		lookupTable["prodfindingmethod"]						= "eVar22";
		lookupTable["merchcategorybrowse"]						= "eVar23";
		lookupTable["pagetypeid"]							= "eVar24";
		lookupTable["originatingpage"]							= "eVar25";
		lookupTable["promocode"]							= "eVar26";
		lookupTable["shipmethod"]							= "eVar27";
		lookupTable["paymentmethod"]							= "eVar28";
		lookupTable["originalsite"]							= "eVar29";
		lookupTable["recentsite"]							= "eVar30";
		lookupTable["deliverymethod"]							= "eVar31";
		lookupTable["ordertype"]							= "eVar32";
		lookupTable["logintype"]							= "eVar33"
		lookupTable["label"]								= "eVar34";
		lookupTable["commentdesc"]							= "eVar35";
		//lookupTable[""]								= "eVar36";
		//lookupTable[""]								= "eVar37";
		lookupTable["discountcode"]							= "eVar38";
		lookupTable["purchaseid"]							= "eVar39";
		lookupTable["videoname"]							= "eVar41";
		lookupTable["pagenameseg"]							= "eVar48";
		lookupTable["discountorder"]							= "eVar51";
		lookupTable["purchaseclickinfo"]						= "eVar53";
		lookupTable["predsearchsel"]							= "eVar61";
		// The following eVars are title specific therefore we
		// DO NOT label specifically
		lookupTable["e65"]								= "eVar65";
		lookupTable["e66"]								= "eVar66";
		lookupTable["e67"]								= "eVar67";
		lookupTable["e68"]								= "eVar68";
		lookupTable["e69"]								= "eVar69";
		lookupTable["e70"]								= "eVar70";
		lookupTable["e71"]								= "eVar71";
		lookupTable["e72"]								= "eVar72";
		lookupTable["e73"]								= "eVar73";
		lookupTable["e74"]								= "eVar74";
		lookupTable["e75"]								= "eVar75";
	}
			
	//sProps
	if(typeOfValue == "props"){
		lookupTable["userid"]								= "prop1";
		lookupTable["sitecode"]								= "prop2";
		lookupTable["brand"]								= "prop3";
		lookupTable["franchise"]							= "prop4";
		lookupTable["game"]								= "prop5";
		lookupTable["platform"]								= "prop6";
		lookupTable["studio"]								= "prop7";
		lookupTable["registrationlevel"]						= "prop8";
		lookupTable["sitetype"]								= "prop9";
		lookupTable["contenttitle"]							= "prop10";
		lookupTable["territory"]							= "prop11";
		lookupTable["language"]								= "prop12";
		lookupTable["contentmediatype"]							= "prop13";
		lookupTable["contentcategory"]							= "prop14";
		lookupTable["contentbucket"]							= "prop15";
		lookupTable["contenttype"]							= "prop16";
		lookupTable["country"]								= "prop17";
		lookupTable["siteid"]								= "prop18";
		lookupTable["abtest"]								= "prop19";
		lookupTable["intsearchterms"]							= "prop20";
		lookupTable["searchnoresults"]							= "prop21";
		lookupTable["searchcategory"]							= "prop22";
		lookupTable["pagetypeid"]							= "prop23";
		lookupTable["smcustomlinkname"]							= "prop24";
		lookupTable["prodregplatform"]							= "prop25";
		lookupTable["prodreggametitle"]							= "prop26";
		lookupTable["mdmfranchise"]							= "prop27";
		lookupTable["gfcategory"]							= "prop28";
		lookupTable["gfcomponent"]							= "prop29";
		lookupTable["secondarysearchterm"]						= "prop30";
		lookupTable["predsearchsel"]							= "prop31";
		lookupTable["mdmid"]								= "prop32";
		lookupTable["subbrand"]								= "prop35";
		lookupTable["secondarypersona"]							= "prop36";
		lookupTable["actiontype"]							= "prop37";
		lookupTable["languagetype"]							= "prop38";
		lookupTable["categorytype"]							= "prop39";
		lookupTable["itemdesc"]								= "prop40";
		lookupTable["simpointsspent"]							= "prop41";
		lookupTable["simpointspurch"]							= "prop42";
		lookupTable["userstatus"]							= "prop43";
		lookupTable["currcampaign"]							= "prop47";
		lookupTable["pagenameseg"]							= "prop48";
		lookupTable["currurl"]								= "prop49";
		lookupTable["currrsi"]								= "prop50";
		// The following props are title specific therefore we
		// DO NOT label specifically
		lookupTable["p65"]								= "prop65";
		lookupTable["p66"]								= "prop66";
		lookupTable["p67"]								= "prop67";
		lookupTable["p68"]								= "prop68";
		lookupTable["p69"]								= "prop69";
		lookupTable["p70"]								= "prop70";
		lookupTable["p71"]								= "prop71";
		lookupTable["p72"]								= "prop72";
		lookupTable["p73"]								= "prop73";
		lookupTable["p74"]								= "prop74";
		lookupTable["p75"]								= "prop75";
		lookupTable["server"]								= "server";
	}
	
	//events 
	if(typeOfValue == "events"){
		//custom events below
		lookupTable["htmlopens"] 							= "event1";
		lookupTable["successdownload"] 							= "event2";
		lookupTable["successregistration"] 						= "event3";
		lookupTable["passalong"] 							= "event4";
		lookupTable["successentitlementexpiration"] 					= "event5";
		lookupTable["successentitlement"] 						= "event6";
		lookupTable["totalclicks"] 							= "event7";
		lookupTable["loginfail"] 							= "event8";
		lookupTable["successgamespecific"] 						= "event9";
		lookupTable["searches"] 							= "event10";
		lookupTable["successsupport"] 							= "event11";
		lookupTable["successfindastore"] 						= "event12";
		lookupTable["proddetailviews"] 							= "event13";
		lookupTable["logins"] 								= "event14";
		lookupTable["successpurchaseintent"] 						= "event15";
		lookupTable["successnewsletter"] 						= "event16";
		lookupTable["successcancelsubscription"] 					= "event17";
		lookupTable["acctcreation"] 							= "event18";
		lookupTable["shipping"] 							= "event19";
		lookupTable["tax"] 								= "event20";
		lookupTable["revieworder"] 							= "event21";
		lookupTable["cashcardpurchase"] 						= "event23";
		lookupTable["simsptspurch"] 							= "event30";
		lookupTable["fullscreenmode"] 							= "event40";
		lookupTable["purcheacc"] 							= "event41";
		lookupTable["videostart"] 							= "event42";
		lookupTable["videostop"] 							= "event43";
		lookupTable["videopause"] 							= "event44";
		lookupTable["videocontinue"] 							= "event45";
		lookupTable["purchaseclick"] 							= "event53";
		lookupTable["loginstart"] 							= "event54";
		lookupTable["regstart"] 							= "event55";
		lookupTable["commentmade"] 							= "event56";
		lookupTable["retailerview"] 						= "event60";
		// The following event are title specific therefore we
		// DO NOT label specifically
		lookupTable["ev91"]								= "event91";
		lookupTable["ev92"]								= "event92";
		lookupTable["ev93"]								= "event93";
		lookupTable["ev94"]								= "event94";
		lookupTable["ev95"]								= "event95";
		lookupTable["ev96"]								= "event96";
		lookupTable["ev97"]								= "event97";
		lookupTable["ev98"]								= "event98";
		lookupTable["ev99"]								= "event99";
		lookupTable["ev100"]								= "event100";
		
		// standard events below
		lookupTable["successproductview"] 						= "prodView";
		lookupTable["successcartview"] 							= "scView";
		lookupTable["successscopen"] 							= "scOpen";
		lookupTable["successscadd"] 							= "scAdd";
		lookupTable["successscremove"] 							= "scRemove";
		lookupTable["successsccheckout"] 						= "scCheckout";
		lookupTable["successpurchase"] 							= "purchase";
	}
	
	//additionalvalues
	if(typeOfValue == "additionalValues"){
		lookupTable["zip"]								= "zip";
		lookupTable["campaign"]								= "campaign";
		lookupTable["state"]								= "state";
		lookupTable["usd"]								= "USD";
        lookupTable["charset"]									= "charSet";
		lookupTable["purchaseid"]							= "purchaseID";
	}
	
	var omniValue = lookupTable[currValue];
	if (omniValue == null){
		omniValue = "notFound";
	}
	return omniValue;
};

//////////////////////////////////////////////////////////////////////////////////////
// Function omniLocalize
//
// Description: localizes relevant variables in HTML (not flash) based on language code
// 
// langCode - required language code 
//
// addRSI - optional additional report suites (comma delimited) to be appended to the
//          standard report suites that are already associated with the specified
//          language code 
// 
// sendBroadcast - optional flag to send broadcast,(0) don't send and (1) send. 
//                 If no parameter then defaults to (1), send
// 
// isEcomSite - optional flag to denote if an ecommerce site, (0) not ecomm, (1) is
//
// addDevDomains - optional string of comma separated keyword matches for additional development
//                 domains exclusive from "alpha.", "beta." & "dev." that need to be
//                 flagged as non-production environment
//
// includeDevDomains - optional string of comma separated keyword matches for exclusion from
//                     predetermined development environments("alpha.", "beta." & "dev.")
//                     that need to be flagged as production environment
//
//////////////////////////////////////////////////////////////////////////////////////
function omniLocalize(langCode, addRSI, sendBroadcast, isEcomSite, addDevDomains, includeDevDomains){ 

    var langCodeLC = langCode.toLowerCase();
 
    var localizedTable = new Array();
    
    localizedTable["en_intl"]      = new Array("INTL","GLOBAL","eaeacom");
    localizedTable["en_ca"]        = new Array("CA","NA","eaeacom,eaeacomna");
    localizedTable["zh_cn"]        = new Array("CN","APAC","eaeacom,eaeacomapac,eagamescn");
    localizedTable["en_hk"]        = new Array("HK","APAC","eaeacom,eaeacomapac,eagameshk");
    localizedTable["zh_hk"]        = new Array("HK","APAC","eaeacom,eaeacomapac,eagameshk");
    localizedTable["en_in"]        = new Array("IN","APAC","eaeacom,eaeacomapac,eagamesin");
    localizedTable["zh_tw"]        = new Array("TW","APAC","eaeacom,eaeacomapaceagamestw");
    localizedTable["cs_cz"]        = new Array("CZ","EMEA","eaeacom,eaeacomeu,easportscz");
    localizedTable["da_dk"]        = new Array("DK","EMEA","eaeacom,eaeacomeu,easportsdk");
    localizedTable["nl_nl"]        = new Array("NL","EMEA","eaeacom,eaeacomeu,easportsnl");
    localizedTable["en_au"]        = new Array("AU","APAC","eaeacom,eaeacomapac,eagamesau");
    localizedTable["en_ie"]        = new Array("IE","EMEA","eaeacom,eaeacomeu,easportsie");
    localizedTable["en_nz"]        = new Array("NZ","APAC","eaeacom,eaeacomapac,eagamesnz");
    localizedTable["en_za"]        = new Array("ZA","APAC","eaeacom,eaeacomapac,eagamesza");
    localizedTable["en_gb"]        = new Array("UK","EMEA","eaeacom,eaeacomeu,eagamesuk");
    localizedTable["en_us"]        = new Array("US","NA","eaeacom,eaeacomna");
    localizedTable["fi_fi"]        = new Array("FI","EMEA","eaeacom,eaeacomeu,easportsfi");
    localizedTable["fr_fr"]        = new Array("FR","EMEA","eaeacom,eaeacomeu,easportsfr");
    localizedTable["de_de"]        = new Array("DE","EMEA","eaeacom,eaeacomeu,eagamesde");
    localizedTable["hu_hu"]        = new Array("HU","EMEA","eaeacom,eaeacomeu,easportshu");
    localizedTable["it_it"]        = new Array("IT","EMEA","eaeacom,eaeacomeu,easportsit");
    localizedTable["ja_jp"]        = new Array("JP","APAC","eaeacom,eaeacomapac,eagamesjp");
    localizedTable["ko_kr"]        = new Array("KR","APAC","eaeacom,eaeacomapac,eagameskr");
    localizedTable["es_mx"]        = new Array("MX","EMEA","eaeacom,eaeacomeu,easportsmx");
    localizedTable["no_no"]        = new Array("NO","EMEA","eaeacom,eaeacomeu,easportsno");
    localizedTable["pl_pl"]        = new Array("PL","EMEA","eaeacom,eaeacomeu,easportspl");
    localizedTable["pt_br"]        = new Array("BR","EMEA","eaeacom,eaeacomeu,easportsbr");
    localizedTable["pt_pt"]        = new Array("PT","EMEA","eaeacom,eaeacomeu,easportspt");
    localizedTable["ru_ru"]        = new Array("RU","EMEA","eaeacom,eaeacomeu,eagamesru");
    localizedTable["es_es"]        = new Array("ES","EMEA","eaeacom,eaeacomeu,easportses");
    localizedTable["sv_se"]        = new Array("SE","EMEA","eaeacom,eaeacomeu,easportsse");
    localizedTable["th_th"]        = new Array("TH","APAC","eaeacom,eaeacomapac,eagamesth");
    localizedTable["en_sg"]        = new Array("SG","APAC","eaeacom,eaeacomapac,eagamessg");
    localizedTable["en_ph"]        = new Array("PH","APAC","eaeacom,eaeacomapac,eagamesph");
    localizedTable["el_gr"]        = new Array("GR","EMEA","eaeacom,eaeacomeu,easportsgr");
    localizedTable["fr_be"]        = new Array("BE","EMEA","eaeacom,eaeacomeu,easportsnl");
    localizedTable["nl_be"]        = new Array("BE","EMEA","eaeacom,eaeacomeu,easportsnl");
    
    var currCountry;
    var currRegion;
    var currRSI;
        
    if(localizedTable[langCodeLC] != null) {
        currCountry = localizedTable[langCodeLC][0];
        currRegion = localizedTable[langCodeLC][1];
        currRSI = localizedTable[langCodeLC][2];
    } else {
        currCountry = "US";
        currRegion = "NA";
        currRSI = "eaeacom,eaeacomna";
    }
    
    var ps = ":";
    
    s_ea.pageName = currRegion + ps + currCountry + s_ea.pageName.substring(s_ea.pageName.indexOf(":", s_ea.pageName.indexOf(":")+1));
 
    s_ea.prop11= currRegion;
    s_ea.prop12= langCode;
    s_ea.prop17= currCountry;
    
    var currSiteID = s_ea.prop18.split(":");
	if (currSiteID.length == 3) {
	    s_ea.prop18 = currCountry + ps + currSiteID[1] + ps + currSiteID[2];
	}
	
	var currSiteInitVal = s_ea.eVar29.split(":");
	if (currSiteInitVal.length == 3) {
	    s_ea.eVar29 = currCountry + ps + currSiteInitVal[1] + ps + currSiteInitVal[2];
	}

    s_ea.eVar17= currCountry;
    s_ea.eVar18= currRegion;
    
    if(isNotEmpty(isEcomSite)){
		  if(!isEcomSite){
            	var currMRSiteID = s_ea.eVar30.split(":");
			if (currMRSiteID.length == 3) {
      			s_ea.eVar30 = currCountry + ps + currMRSiteID[1] + ps + currMRSiteID[2];
			}
        }
    }else{
		var currMRSiteID = s_ea.eVar30.split(":");
		if (currMRSiteID.length == 3) {
      		s_ea.eVar30 = currCountry + ps + currMRSiteID[1] + ps + currMRSiteID[2];
					}
		}

    if(isNotEmpty(addRSI)){
        currRSI += "," + addRSI;
    }
    
    	if(isNotEmpty(sendBroadcast)) {
			if(sendBroadcast){
				modifyOmniRSI(omniCheckHost(currRSI,addDevDomains,includeDevDomains),1);
			}else{
				modifyOmniRSI(omniCheckHost(currRSI,addDevDomains,includeDevDomains),0);
			}
		}else{
			modifyOmniRSI(omniCheckHost(currRSI,addDevDomains,includeDevDomains),1);
	}
};

//////////////////////////////////////////////////////////////////////////////////////
// Function omniSetPageTypeId
//
// Description: Updates the last segment of the pageName (Page Type Id) but will not
// be reported until additional call is made to Omniture unless broadcast flag is set
// 
// newPTI - value that the last segment of the pageName will be changed to.
//
// sendBroadcast - flag to send broadcast, (0) don't send and (1) send. 
//                 If no parameter then defaults to (0), don't send
//
// p10value - optional value for prop10
//
// p15value - optional value for prop15
//
//////////////////////////////////////////////////////////////////////////////////////	
function omniSetPageTypeId(newPTI,sendBroadcast,p10value,p15value){
	var str = s_ea.pageName;
  	s_ea.pageName = str.replace(/:[^:]*$/,':'+newPTI);
	
	if(isNotEmpty(p10value)){
		s_ea.prop10 = p10value;
	}
	
	if(isNotEmpty(p15value)){
		s_ea.prop15 = p15value;
	}
		
	if(isNotEmpty(sendBroadcast)) {
		if(sendBroadcast){
			omniCallPage();
		}
	}
 };
 
//////////////////////////////////////////////////////////////////////////////////////
// Function omniCallPage
//
// Description: makes a page broadcast (psuedo HTTP Request)
//
// Called By: page
//
//////////////////////////////////////////////////////////////////////////////////////
function omniCallPage(){
	setOmniValues('','','','','','',1,'','');
};

////////////////////////////////////////////////////////////////////////////////////////
// Function omniVideoTrack
//
// Description: tracks video states
//
// videoName - name of video being tracked
//
// videoState - 0: video stop
//              1: video start(default)
//              2: video pause
//              3: video continue
//
// Called By: video 
//
//////////////////////////////////////////////////////////////////////////////////////
function omniVideoTrack(videoName, videoState){

	if(!isNotEmpty(videoState)) { videoState = 1; }

	if(isNotEmpty(videoName)) {
	
		var pnStub = s_ea.getPageNameSegStrip();

		if(videoState == 0){
			pnStub += ":videoComplete";
			setOmniValues('','o','videoComplete','pagenameseg='+pnStub+',currurl='+s_ea.prop49+',currrsi='+s_ea.prop50,'pagenameseg='+pnStub+',videoname='+videoName,'videoStop',0);
		}
		if(videoState == 1){
			pnStub += ":videoStart";
			setOmniValues('','o','videoStart','pagenameseg='+pnStub+',currurl='+s_ea.prop49+',currrsi='+s_ea.prop50,'pagenameseg='+pnStub+',videoname='+videoName,'videoStart',0);
		}
		if(videoState == 2){
			pnStub += ":videoPause";
			setOmniValues('','o','videoPause','pagenameseg='+pnStub+',currurl='+s_ea.prop49+',currrsi='+s_ea.prop50,'pagenameseg='+pnStub+',videoname='+videoName,'videoPause',0);
		}
		if(videoState == 3){
			pnStub += ":videoContinue";
			setOmniValues('','o','videoContinue','pagenameseg='+pnStub+',currurl='+s_ea.prop49+',currrsi='+s_ea.prop50,'pagenameseg='+pnStub+',videoname='+videoName,'videoContinue',0);
		}
	}
};

////////////////////////////////////////////////////////////////////////////////////////
// Function omniLogin
//
// Description: reports login event as custom link or psuedo HTTP request
//
// reportPage - boolean for custom link (0) or psuedo HTTP request (1 - default)
//
// loginType - string to differentiate type of login initiated ("NUCLEUS"  default)
//
// Called By: page
//
//////////////////////////////////////////////////////////////////////////////////////
function omniLogin(reportPage,loginType){

	if(!isNotEmpty(loginType)){
		loginType = "NUCLEUS";
	}
	
	if(!isNotEmpty(reportPage) || reportPage == 1 ){
		setOmniValues('','','login','','logintype='+loginType.toUpperCase(),'logins',1,'','');
	}else{
		var pnStub = s_ea.getPageNameSegStrip();
		pnStub += ":login";
		setOmniValues('','o','login','pagenameseg='+pnStub+',currurl='+s_ea.prop49+',currrsi='+s_ea.prop50,'pagenameseg='+pnStub+',logintype='+loginType.toUpperCase(),'logins',0,'','');
	}
};

////////////////////////////////////////////////////////////////////////////////////////
// Function omniLoginFail
//
// Description: reports login failure event as custom link or psuedo HTTP request
//
// reportPage - boolean for custom link (0) or psuedo HTTP request (1 - default)
//
// errorCode - optional string of type of login failure
//
// Called By: page
//
//////////////////////////////////////////////////////////////////////////////////////
function omniLoginFail(reportPage,errorCode){

	var currProp10val = s_ea.prop10;
	
	if(!isNotEmpty(errorCode)){
		errorCode = "No Error Code";
	}
		
	if(!isNotEmpty(reportPage) || reportPage == 1 ){
		setOmniValues('','','','contentTitle='+errorCode,'','loginFail',1,'','');
	}else{
	
		var pnStub = s_ea.getPageNameSegStrip();
		pnStub += ":loginFail";
		setOmniValues('','o','loginFail','pagenameseg='+pnStub+',contentTitle='+errorCode+',currurl='+s_ea.prop49+',currrsi='+s_ea.prop50,'pagenameseg='+pnStub,'loginFail',0,'','');
	}
	
	s_ea.prop10 = currProp10val;
};

////////////////////////////////////////////////////////////////////////////////////////
// Function omniRegLogin
//
// Description: reports registration and optional login event as custom link or psuedo
// HTTP request
//
// reportPage - boolean for custom link (0) or psuedo HTTP request (1 - default)
//
// regType - string to associate what type of registration is occuring 
//           (defaults to "acccreat")
//
// reportLogin - boolean to additionally report the login event (default to 0)
//
// Called By: page
//
//////////////////////////////////////////////////////////////////////////////////////
function omniRegLogin(reportPage,regType,reportLogin){

	var eventStr = "successregistration";
	var clName = "registration";
		
	if(!isNotEmpty(reportPage)){
		reportPage = 1;
	}
		
	if(!isNotEmpty(regType)){
		regType = "acccreat";
	}
		
	if(!isNotEmpty(reportLogin)){
		reportLogin = 0;
	}
		
	if(reportLogin){
		eventStr += ",logins";
		clName += "Login";
	}
		
	if(reportPage){
		setOmniValues('','','','','registrationtype='+regType,eventStr,1,'','',omniSetPageTypeId("REGISTRATIONSUCCESS"));
	}else{
		var pnStub = s_ea.getPageNameSegStrip();
		pnStub += ":" + clName;
		setOmniValues('','o',clName,'pagenameseg='+pnStub+',currurl='+s_ea.prop49+',currrsi='+s_ea.prop50,'pagenameseg='+pnStub+',registrationtype='+regType,eventStr,0,'','');
	}
};

//////////////////////////////////////////////////////////////////////////////////////
// Function omniLoginStart
//
// Description: reports loginStart event as custom link or psuedo HTTP request
//
// reportPage - boolean for custom link (0) or psuedo HTTP request (1 - default)
//
// Called By: page
//
//////////////////////////////////////////////////////////////////////////////////////
function omniLoginStart(reportPage){
		
	if(!isNotEmpty(reportPage) || reportPage == 1 ){
		setOmniValues('','','loginStart','','','loginstart',1,'','');
	}else{
		var pnStub = s_ea.getPageNameSegStrip();
		pnStub += ":loginStart";
		setOmniValues('','o','loginStart','pagenameseg='+pnStub+',currurl='+s_ea.prop49+',currrsi='+s_ea.prop50,'pagenameseg='+pnStub,'loginstart',0,'','');
	}
};

///////////////////////////////////////////////////////////////////////////////////////
// Function omniRegStart
//
// Description: reports regStart event as custom link or psuedo HTTP request
//
// reportPage - boolean for custom link (0) or psuedo HTTP request (1 - default)
//
// Called By: page
//
//////////////////////////////////////////////////////////////////////////////////////
function omniRegStart(reportPage){
		
	if(!isNotEmpty(reportPage) || reportPage == 1 ){
		setOmniValues('','','regStart','','','regstart',1,'','');
	}else{
		var pnStub = s_ea.getPageNameSegStrip();
		pnStub += ":regStart";
		setOmniValues('','o','regStart','pagenameseg='+pnStub+',currurl='+s_ea.prop49+',currrsi='+s_ea.prop50,'pagenameseg='+pnStub,'regstart',0,'','');
	}
};

///////////////////////////////////////////////////////////////////////////////////////
// Function omniInheritPage
//
// Description: used only on registration and login flows to enable these pages to 
// inherit selected values of the sites they are integratex with for reporting purposes
//
// rsid - new report suites to report to (comma delimited string)
//
// newGameName - new string game name for 8th segment of pageName
//
// newFranchise - new string franchise name for 6th segment of pageName
//
// newStudio - new string studio name for 4th segment of pageName
//
// newProp10value - string for new prop10 value
//
// newProp15value - string for new prop15 value
//
// newPTI - new string for pageTypeID (last segment of the pageName
//
// eventType - numeric type of event to report (no event "0" default)
// 		0 - no event (default)
// 		1 - login start
// 		2 - registration start
// 		3 - login success (with optional loginType which defaults to "NUCLEUS")
// 		4 - registration only (with optional regType which defaults to "acccreat")
// 		5 - registration & login (with optional regType which defaults to "acccreat")
// 		6 - login failure (with optional errorCode which defaults to "No Error Code") 
//
// regType - optional string registration type to be passed with registration event (defaults to "acccreat")
//
// loginType - string value to determine type of login
//             'NUCLEUS' (default)
//             'FBConnect' (Facebook)
//             'PSNConnect' (Playstation Network)
//
// errorCode - optional string error code which defaults to "No Error Code"
//
// Called By: page
//
//////////////////////////////////////////////////////////////////////////////////////
function omniInheritPage(rsid,newGameName,newFranchise,newStudio,newProp10value,newProp15value,newPTI,eventType,regType,loginType,errorCode){
		
	if(isNotEmpty(s_ea.pageName)){
		var newPageName = s_ea.pageName;
		var p10v = s_ea.prop10;
		var p15v = s_ea.prop15;

  		if(isNotEmpty(rsid)){modifyOmniRSI(omniCheckHost(rsid));}
 
 		var arrayPN = s_ea.pageName.split(":");
 
 		if(isNotEmpty(newPTI)){arrayPN[8] = newPTI.toUpperCase();}
  
  		if((eventType == "4") || (eventType == "5")){ arrayPN[8] = "REGISTRATIONSUCCESS";}
 
  		if(isNotEmpty(newGameName)){arrayPN[7] = newGameName.toUpperCase();}
 
 		if(isNotEmpty(newFranchise)){arrayPN[5] = newFranchise.toUpperCase();}
 
  		if(isNotEmpty(newStudio)){arrayPN[3] = newStudio.toUpperCase();}
 
  		newPageName = arrayPN.join(":")
   
 		if(isNotEmpty(newProp10value)){p10v = newProp10value;}
 
 		if(isNotEmpty(newProp15value)){p15v = newProp15value.toUpperCase();}
 
 		if(!isNotEmpty(eventType)){eventType = 0;}
 
 		switch(eventType){
			case 0:
  				setOmniValues('','','','contenttitle='+p10v+',contentbucket='+p15v+',sitecode='+newGameName+',franchise='+newFranchise+',studio='+newStudio+'','','',1,'','',newPageName);
  				break;
			case 1:
  				setOmniValues('','','','contenttitle='+p10v+',contentbucket='+p15v+',sitecode='+newGameName+',franchise='+newFranchise+',studio='+newStudio+'','','loginstart',1,'','',newPageName);
   				break;
			case 2:
   				setOmniValues('','','','contenttitle='+p10v+',contentbucket='+p15v+',sitecode='+newGameName+',franchise='+newFranchise+',studio='+newStudio+'','','regstart',1,'','',newPageName);
  				break;
			case 3:
				if(!isNotEmpty(loginType)){loginType = "NUCLEUS";}
  				setOmniValues('','','','contenttitle='+p10v+',contentbucket='+p15v+',sitecode='+newGameName+',franchise='+newFranchise+',studio='+newStudio+'','logintype='+loginType.toUpperCase(),'logins',1,'','',newPageName);
  				break;
			case 4:
				if(!isNotEmpty(regType)){regType = "acccreat";}
  				setOmniValues('','','','contenttitle='+p10v+',contentbucket='+p15v+',sitecode='+newGameName+',franchise='+newFranchise+',studio='+newStudio+'','registrationtype='+regType,'successregistration',1,'','',newPageName);//omniSetPageTypeId("REGISTRATIONSUCCESS")
   				break;
			case 5:
				if(!isNotEmpty(regType)){regType = "acccreat";}
   				setOmniValues('','','','contenttitle='+p10v+',contentbucket='+p15v+',sitecode='+newGameName+',franchise='+newFranchise+',studio='+newStudio+'','registrationtype='+regType,'successregistration,logins',1,'','',newPageName);//omniSetPageTypeId("REGISTRATIONSUCCESS")
  				break;
			case 6:
				if(!isNotEmpty(errorCode)){errorCode = "No Error Code";}
   				setOmniValues('','','','contenttitle='+errorCode+',contentbucket='+p15v+',sitecode='+newGameName+',franchise='+newFranchise+',studio='+newStudio+'','','loginFail',1,'','',newPageName);
  				s_ea.prop10 = p10v;
  				break;
			default:
  				setOmniValues('','','','contenttitle='+p10v+',contentbucket='+p15v+',sitecode='+newGameName+',franchise='+newFranchise+',studio='+newStudio+'','','',1,'','',newPageName);
  
		}
 
 	}
  
 };
	
//////////////////////////////////////////////////////////////////////////////////////
// Function initSessionTimerValues
//
// sets starting and end min for session moniitoring 
//
// Called By: omniKeepSessionAlive
//
//////////////////////////////////////////////////////////////////////////////////////	
function initSessionTimerValues(){

	currStartMin = getCurrMin();
	var sessionTimeMin = 28;
	var timeThreshold = 31
	var minAdj = 32;

	if (currStartMin <= timeThreshold){
  		targetMinCnt = currStartMin + sessionTimeMin;
	}else{
  		targetMinCnt = currStartMin - minAdj;
	}
};

//////////////////////////////////////////////////////////////////////////////////////
// Function getCurrMin
//
// gets current minute (0-59)
//
// returns: current minute (0-59)
//
// Called By: omniKeepSessionAlive, initSessionTimerValues
//
//////////////////////////////////////////////////////////////////////////////////////	
function getCurrMin(){

	var currentTime = new Date()
	var minStart = currentTime.getMinutes();
	return minStart;
};

//////////////////////////////////////////////////////////////////////////////////////
// Function omniKeepSessionAlive
//
// Description: utility function recursively called. This function extends the user 
// session by sending out a custom link broadcast at approx 28 mins. of the session
// since the session will end at 30 min. For EBISU we do not want to limit the session
// to 30 minutes of inactivity so we use prop5 to verify if EBISU. We do not extend
// the session for any other web properties
//
//////////////////////////////////////////////////////////////////////////////////////	
function omniKeepSessionAlive(){

	if (typeof(s_ea.prop5)!="undefined"){
		var p5Val = "ebisu"
		if(p5Val.indexOf(s_ea.prop5.toLowerCase())!=-1){
			if(!timerStarted){
				initSessionTimerValues();
				timerStarted = 1;
			}
			var currTime = getCurrMin();
			if (targetMinCnt == currTime){
				timerStarted = 0;
				omniLinkCall('extendSession');
			}
		setTimeout("omniKeepSessionAlive()",50000);
		}
 	}
};

setTimeout("omniKeepSessionAlive()",10000);//kicks off timer onload

//////////////////////////////////////////////////////////////////////////////////////
// Deprecated functions
//////////////////////////////////////////////////////////////////////////////////////
function buildContentType(){};
function omniUpdateContentType(){};
//////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////
// END OF CODE
//////////////////////////////////////////////////////////////////////////////////////
