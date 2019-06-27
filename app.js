var express     = require("express"),
    app         = express(),
    bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    passport    = require("passport"),
    LocalStrategy = require("passport-local"),
    flash        = require("connect-flash"),
    methodOverride = require("method-override"),
    campground  = require("./models/campground"),
    Comment     = require("./models/comments"),
    User        = require("./models/user"),
    seedDB      = require("./seeds")
    
//mongoose.connect("mongodb://localhost/yelp_camp");
//mongoose.connect("mongodb+srv://sumit123:Sumit123@yelpcamp-nmzgh.mongodb.net/test?retryWrites=true&w=majorit");
//mongodb+srv://sumit123:<password>@yelpcamp-nmzgh.mongodb.net/test?retryWrites=true&w=majority
var MongoClient = require("mongodb").MongoClient;

var uri = "mongodb://sumit123:Sumit123@yelpcamp-nmzgh.mongodb.net/test?retryWrites=true&w=majority";
MongoClient.connect(uri, function(err,db){
    db.close();
});



app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
//seedDB();

// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "Once again Rust y wins cutest dog!",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride("_method"));
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(flash());

app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   res.locals.error = req.flash("error");
   res.locals.success = req.flash("success");
   next();
});


app.get("/", function(req, res){
    res.render("landing");
});

//INDEX - show all campgrounds
app.get("/campgrounds", function(req, res){
    // Get all campgrounds from DB
    campground.find({}, function(err, allCampgrounds){
       if(err){
           console.log(err);
       } else {
          res.render("campgrounds",{campgrounds:allCampgrounds});
       }
    });
});

//CREATE - add new campground to DB
app.post("/campgrounds", function(req, res){
    // get data from form and add to campgrounds array
    var name = req.body.name;
    var price = req.body.price;
    var image = req.body.image;
    var desc = req.body.description;
     var author = {
        id : req.user._id,
        username : req.user.username
    }
    var newCampground = {name: name,price:price, image: image, description: desc , author:author}
   
    // Create a new campground and save to DB
    campground.create(newCampground, function(err, newlyCreated){
        if(err){
            console.log(err);
        } else {
            //redirect back to campgrounds page
            res.redirect("/campgrounds");
        }
    });
});

//NEW - show form to create new campground
app.get("/campgrounds/new",isLoggedIn, function(req, res){
   res.render("new"); 
});

// SHOW - shows more info about one campground
app.get("/campgrounds/:id", function(req, res){
    //find the campground with provided ID
    campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
        if(err){
            console.log(err);
        } else {
            console.log(foundCampground)
            //render show template with that campground
            res.render("show", {campground: foundCampground});
        }
    });
});


// ====================
// COMMENTS ROUTES
// ====================

app.get("/campgrounds/:id/comments/new", isLoggedIn, function(req, res){
    // find campground by id
    campground.findById(req.params.id, function(err, campground){
        if(err){
            console.log(err);
        } else {
             res.render("new1", {campground: campground});
        }
    })
});

app.post("/campgrounds/:id/comments",isLoggedIn,function(req, res){
   //lookup campground using ID
   campground.findById(req.params.id, function(err, campground){
       if(err){
           console.log(err);
           res.redirect("/campgrounds");
       } else {
        Comment.create(req.body.comment, function(err, comment){
           if(err){
               console.log(err);
           } else {
               comment.author.id=req.user._id;
               comment.author.username= req.user.username;
               comment.save();
               campground.comments.push(comment);
               campground.save();
               res.redirect('/campgrounds/' + campground._id);
           }
        });
       }
   });
   //create new comment
   //connect new comment to campground
   //redirect campground show page
});


//  ===========
// AUTH ROUTES
//  ===========

// show register form
app.get("/register", function(req, res){
   res.render("register"); 
});
//handle sign up logic
app.post("/register", function(req, res){
    var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            console.log(err);
            return res.render("register");
        }
        passport.authenticate("local")(req, res, function(){
           res.redirect("/campgrounds"); 
        });
    });
});

// show login form
app.get("/login", function(req, res){
   res.render("login"); 
});
// handling login logic
app.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/campgrounds",
        failureRedirect: "/login"
    }), function(req, res){
});

//Logout  logic route
app.get("/logout", function(req, res){
   req.logout();
   req.flash("success","Logged You Out!");
   res.redirect("/campgrounds");
});

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error","You need to be logged in to do that")
    res.redirect("/login");
}

// Edit ROUTES
app.get("/campgrounds/:id/edit",checkCampgroundOwnership, function(req, res){
    campground.findById(req.params.id,function(err,foundCampground){
        if(err)
        {
            res.redirect("/campgrounds")
        }
        else
        {
           res.render("edit",{campground:foundCampground});   
        }
    });
});

// UPDATE ROUTES
app.put("/campgrounds/:id",function(req, res) {
   campground.findByIdAndUpdate(req.params.id,req.body.campground,function(err,updatedCamopground){
       if(err)
       {
           res.redirect("/campgrounds")
       }
       else
       {
           res.redirect("/campgrounds/" + req.params.id);
       }
   }) 
});

// Destroy ROUTES
app.delete("/campgrounds/:id", function(req, res){
   campground.findByIdAndRemove(req.params.id, function(err){
      if(err){
          res.redirect("/campgrounds");
      } else {
          res.redirect("/campgrounds");
      }
   });
});

// MiddleWare Authorization
function checkCampgroundOwnership(req, res, next) {
 if(req.isAuthenticated()){
        campground.findById(req.params.id, function(err, foundCampground){
           if(err){
               req.flash("error","Campground not found")
               res.redirect("back");
           }  else {
               // does user own the campground?
            if(foundCampground.author.id.equals(req.user._id)) {
                next();
            } else {
                req.flash("error","You don't have permission to do that")
                res.redirect("back");
            }
           }
        });
    } else {
        req.flash("error","You need to be logged in to do that");
        res.redirect("back");
    }
}

// Edit Comment ROUTES
app.get("/campgrounds/:id/comments/:comment_id/edit",checkCommentOwnership, function(req, res){
    Comment.findById(req.params.comment_id,function(err,foundComment){
        if(err)
        {
            res.redirect("back");
        }
        else
        {
            res.render("edit1",{campground_id: req.params.id,comment:foundComment}); 
        }
    });
});

// Update Comment ROUTES
app.put("/campgrounds/:id/comments/:comment_id",function(req, res) {
   Comment.findByIdAndUpdate(req.params.comment_id,req.body.comment,function(err,updatedComment){
       if(err)
       {
           res.redirect("back")
       }
       else
       {
           res.redirect("/campgrounds/" + req.params.id);
       }
   }) 
});

// Delete Comment ROUTES
app.delete("/campgrounds/:id/comments/:comment_id", function(req, res){
   Comment.findByIdAndRemove(req.params.comment_id, function(err){
      if(err){
          res.redirect("back");
      } else {
          res.redirect("/campgrounds/" + req.params.id);
      }
   });
});

// MiddleWare Comment ROUTES
function  checkCommentOwnership(req, res, next) {
 if(req.isAuthenticated()){
        Comment.findById(req.params.comment_id, function(err, foundComment){
           if(err){
               res.redirect("back");
           }  else {
               // does user own the comment?
            if(foundComment.author.id.equals(req.user._id)) {
                next();
            } else {
                res.redirect("back");
            }
           }
        });
    } else {
        req.flash("error","You don't have permission to do that")
        res.redirect("back");
    }
}

app.listen(process.env.PORT, process.env.IP, function(){
   console.log("The YelpCamp Server Has Started!");
});