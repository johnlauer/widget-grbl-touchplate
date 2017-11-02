requirejs.config({
    paths: {
        Three: '//threejs.org/build/three.min'
    }
});

// Test this element. This code is auto-removed by the chilipeppr.load()
cprequire_test(["inline:com-chilipeppr-widget-touchplate"], function (touchplate) {
    console.log("test running of " + touchplate.id);
    touchplate.init();
    $('body').css('padding', '20px');
} /*end_test*/ );

cpdefine("inline:com-chilipeppr-widget-touchplate", ["chilipeppr_ready", 'Three'], function () {
    return {
        id: "com-chilipeppr-widget-touchplate",
        url: "(auto fill by runme.js)",       // The final URL of the working widget as a single HTML file with CSS and Javascript inlined. You can let runme.js auto fill this if you are using Cloud9.
        fiddleurl: "(auto fill by runme.js)", // The edit URL. This can be auto-filled by runme.js in Cloud9 if you'd like, or just define it on your own to help people know where they can edit/fork your widget
        githuburl: "(auto fill by runme.js)", // The backing github repo
        testurl: "(auto fill by runme.js)",   // The standalone working widget so can view it working by itself
        
        name: "Widget / GRBL Touch Plate",
        desc: "This widget helps you use a touch plate to create your Z zero offset.",
        publish: {
        },
        subscribe: {
        },
        foreignPublish: {
        },
        foreignSubscribe: {
        },
        isInitted: false, // keep track of our one-time init
        offset: 0,
        width: 400,
        height: 500,
        init: function () {

            this.setupUiFromLocalStorage();
            this.btnSetup();

            this.forkSetup();
            
            this.isInitted = true;
            console.log(this.name + " done loading.");
        },

        gcodeCtr: 0,
        isRunning: false,
        onRun: function(evt) {
            // when user clicks the run button
            console.log("user clicked run button. evt:", evt);
            
            if (this.isRunning) {
                // we need to stop
                // swap button to stop
                $('#com-chilipeppr-widget-touchplate .btn-touchplaterun').removeClass("btn-danger").text("Run");
                this.isRunning = false;
                
            } else {
                
                // we need to run the whole darn process
                this.isRunning = true;
                // swap button to stop
                $('#com-chilipeppr-widget-touchplate .btn-touchplaterun').addClass("btn-danger").text("Stop");
                
                // get user feedrate
                var fr = $('#com-chilipeppr-widget-touchplate .frprobe').val();
                //get user depth
                var depth = $('#com-chilipeppr-widget-touchplate .depthprobe').val();
                //set plate offset for use in probe response
                this.offset = $('#com-chilipeppr-widget-touchplate .heightplate').val();
                
                // now start watching for cnc widget response
                chilipeppr.subscribe("/com-chilipeppr-interface-cnccontroller/proberesponse", this, this.probeResponse,1);
                
                // send the probe command to start the movement
                var id = "tp" + this.gcodeCtr++;
                var gcode = "G21 G90 (Use mm and abs coords)\n";
                chilipeppr.publish("/com-chilipeppr-widget-serialport/jsonSend", {Id: id, D: gcode});
                
                //Clear any previous tool offsets
                id = "tp" + this.gcodeCtr++;
                gcode = "G49\n";
                chilipeppr.publish("/com-chilipeppr-widget-serialport/jsonSend", {Id: id, D: gcode});
                
                //Zero out z axis in case user has not, or incase removing preious tool offset has changed Z zero position.
                id = "tp" + this.gcodeCtr++;
                gcode = "G92 Z0\n";
                chilipeppr.publish("/com-chilipeppr-widget-serialport/jsonSend", {Id: id, D: gcode});
                
                //send probe command
                id = "tp" + this.gcodeCtr++;
                gcode = "G38.2 Z"+ depth + " F" + fr + "\n";
                chilipeppr.publish("/com-chilipeppr-widget-serialport/jsonSend", {Id: id, D: gcode});
            }
        },
        probeResponse: function(position) {
            if(position === "alarm" || position.status === "0"){
                console.log("Touchplate: PROBE Failure");
                // swap button to stop
                $('#com-chilipeppr-widget-touchplate .btn-touchplaterun').addClass("btn-danger").text("Alarm!!");
                return false;
            }
    
            console.log("Touchplate: Probe responded with Z position: " + position.z);
            console.log("Touchplate: G43.1 tool offset to: " + (position.z - this.offset).toString());
            
            var id = "tp" + this.gcodeCtr++;
            var gcode = "G43.1 Z" + (position.z - this.offset).toString() + "\n";
            chilipeppr.publish("/com-chilipeppr-widget-serialport/jsonSend", {Id: id, D: gcode});
            
            //now back off 2 mm to allow touch plate removal
            
            id = "tp" + this.gcodeCtr++;
            gcode = "G91 G0 Z2\n"
            chilipeppr.publish("/com-chilipeppr-widget-serialport/jsonSend", {Id: id, D: gcode});
            
            id = "tp" + this.gcodeCtr++;
            gcode = "G90\n"
            chilipeppr.publish("/com-chilipeppr-widget-serialport/jsonSend", {Id: id, D: gcode});
            
            // switch stop button back to "run"
            $('#com-chilipeppr-widget-touchplate .btn-touchplaterun').removeClass("btn-danger").text("Run");
            
            //unsubscribe now that we have our probe response
            chilipeppr.unsubscribe("/com-chilipeppr-interface-cnccontroller/proberesponse", this.probeResponse);
            this.offset = 0; //set offset back to zero for next run (should user change, we want to capture that
            return false;
        },
        
        onresize: function() {
            this.width = $('#com-chilipeppr-widget-touchplate .panel-body').width();
            this.setSize(this.width, this.height);
        },
        dispatch: function ( array, event ) {

            for ( var i = 0, l = array.length; i < l; i ++ ) {

                array[ i ]( event );

            }

        },
        request: null,
        isHidden: false,
        unactivateWidget: function() {
            if (!this.isHidden) {
                // unsubscribe from everything
                console.log("unactivateWidget. unsubscribing.");
                //chilipeppr.unsubscribe("/com-chilipeppr-interface-cnccontroller/axes", this, this.onAxes);
                //chilipeppr.unsubscribe("/com-chilipeppr-widget-serialport/ws/recv", this, this.onWsRecvLaser);
                this.isHidden = true;
            }
        },
        activateWidget: function() {
            if (!this.isInitted) {
                this.init();
            }
            if (this.isHidden) {
                // resubscribe
                console.log("activateWidget. resubscribing.");
                //chilipeppr.subscribe("/com-chilipeppr-interface-cnccontroller/axes", this, this.onAxes);
                //chilipeppr.subscribe("/com-chilipeppr-widget-serialport/ws/recv", this, this.onWsRecvLaser);
                this.isHidden = false;
            }
        },
        options: null,
        setupUiFromLocalStorage: function() {
            // read vals from cookies
            var options = localStorage.getItem('com-chilipeppr-widget-touchplate-options');
            
            if (options) {
                options = $.parseJSON(options);
                console.log("just evaled options: ", options);
            } else {
                options = {
                    showBody: true,
                    frprobe: 50,
                    heightplate: 3.75,
                    depthprobe: -10
                };
            }
            
            // check z
            //if (!('z' in options)) options.z = 1.0;
            
            this.options = options;
            console.log("options:", options);
            
            // show/hide body
            if (options.showBody) {
                this.showBody();
            } else {
                this.hideBody();
            }
            
            // setup textboxes
            $('#com-chilipeppr-widget-touchplate .frprobe').val(this.options.frprobe);
            $('#com-chilipeppr-widget-touchplate .heightplate').val(this.options.heightplate);
            $('#com-chilipeppr-widget-touchplate .depthprobe').val(this.options.depthprobe);
            
            // attach onchange
            $('#com-chilipeppr-widget-touchplate input').change(this.saveOptionsLocalStorage.bind(this));           
        },
        saveOptionsLocalStorage: function() {
            //var options = {
            //    showBody: this.options.showBody
            //};
            
            // grab text vals
            this.options.frprobe = $('#com-chilipeppr-widget-touchplate .frprobe').val();
            this.options.heightplate = $('#com-chilipeppr-widget-touchplate .heightplate').val();
            this.options.depthprobe = $('#com-chilipeppr-widget-touchplate .depthprobe').val();
            
            var options = this.options;
                
            var optionsStr = JSON.stringify(options);
            console.log("saving options:", options, "json.stringify:", optionsStr);
            // store cookie
            localStorage.setItem('com-chilipeppr-widget-touchplate-options', optionsStr);
        },
        showBody: function(evt) {
            $('#com-chilipeppr-widget-touchplate .panel-body').removeClass('hidden');
            //$('#com-chilipeppr-widget-touchplate .panel-footer').removeClass('hidden');
            $('#com-chilipeppr-widget-touchplate .hidebody span').addClass('glyphicon-chevron-up');
            $('#com-chilipeppr-widget-touchplate .hidebody span').removeClass('glyphicon-chevron-down');
            if ((evt !== null)) {
                this.options.showBody = true;
                this.saveOptionsLocalStorage();
            }
        },
        hideBody: function(evt) {
            $('#com-chilipeppr-widget-touchplate .panel-body').addClass('hidden');
            //$('#com-chilipeppr-widget-touchplate .panel-footer').addClass('hidden');
            $('#com-chilipeppr-widget-touchplate .hidebody span').removeClass('glyphicon-chevron-up');
            $('#com-chilipeppr-widget-touchplate .hidebody span').addClass('glyphicon-chevron-down');
            if ((evt !== null)) {
                this.options.showBody = false;
                this.saveOptionsLocalStorage();
            }
        },
        btnSetup: function() {
            
            // chevron hide body
            var that = this;
            $('#com-chilipeppr-widget-touchplate .hidebody').click(function(evt) {
                console.log("hide/unhide body");
                if ($('#com-chilipeppr-widget-touchplate .panel-body').hasClass('hidden')) {
                    // it's hidden, unhide
                    that.showBody(evt);
                } else {
                    // hide
                    that.hideBody(evt);
                }
            });
            
            $('#com-chilipeppr-widget-touchplate .btn-toolbar .btn').popover({
                delay: 500,
                animation: true,
                placement: "auto",
                trigger: "hover",
                container: 'body'
            });
            
            // setup run button
            $('#com-chilipeppr-widget-touchplate .btn-touchplaterun').click(this.onRun.bind(this));
            
            
        },
        statusEl: null, // cache the status element in DOM
        status: function(txt) {
            console.log("status. txt:", txt);
            if (this.statusEl === null) this.statusEl = $('#com-chilipeppr-widget-touchplate-status');
            var len = this.statusEl.val().length;
            if (len > 30000) {
                console.log("truncating status area text");
                this.statusEl.val(this.statusEl.val().substring(len-5000));
            }
            this.statusEl.val(this.statusEl.val() + txt + "\n");
            this.statusEl.scrollTop(
                this.statusEl[0].scrollHeight - this.statusEl.height()
            );
        },
        forkSetup: function() {
            var topCssSelector = '#' + this.id;

            $(topCssSelector + ' .panel-title').popover({
                title: this.name,
                content: this.desc,
                html: true,
                delay: 1000,
                animation: true,
                trigger: 'hover',
                placement: 'auto'
            });

            var that = this;
            chilipeppr.load("http://raw.githubusercontent.com/chilipeppr/widget-pubsubviewer/master/auto-generated-widget.html", function() {
                require(['inline:com-chilipeppr-elem-pubsubviewer'], function(pubsubviewer) {
                    pubsubviewer.attachTo($(topCssSelector + ' .panel-heading .dropdown-menu'), that);
                });
            });

        },
    };
});