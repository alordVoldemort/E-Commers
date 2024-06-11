const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { type } = require("os");
const { stringify } = require("querystring");
const { log, error } = require("console");


app.use(express.json());
app.use(cors());

//Database conntion with mongooDB 

mongoose.connect("mongodb+srv://aniketsangale23:Aniket%404542@cluster0.onwcssh.mongodb.net/E-commerce")
//API Creation

app.get("/", (req, res) => {
    res.send("Express App is Running")
})

// Image storage Engine
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage });

// Serve static files from the 'upload/images' directory
app.use('/images', express.static(path.join(__dirname, 'upload/images')));

// Define the upload endpoint
app.post("/upload", upload.single('product'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: 0, message: 'No file uploaded' });
    }
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    });
});

// Schema for creating the products

const Product = mongoose.model("Product", {
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    new_price: {
        type: Number,
        required: true,
    },
    old_price: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    available: {
        type: Boolean,
        default: true
    },

})

app.post('/addproduct', async (req, res) => {
    let products = await Product.find({});
    let id;
    if (products.length > 0) {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id + 1;
    } else {
        id = 1;
    }
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,

    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success: true,
        name: req.body.name,
    })
})
// Creating API For deleting the products

app.post('/removeproduct', async (req, res) => {
    await Product.findOneAndDelete({ id: req.body.id });
    console.log("Removed");
    res.json({
        success: true,
        name: req.body.name
    })
})

// Creating API for getting all products 
app.get('/allproducts', async (req, res) => {
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.send(products);
})

// Shema Creating for user model

const Users = mongoose.model('Users', {
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,

    },
    cartData: {
        type: Object,
    },
    date: {
        type: Date,
        default: Date.now,
    }
})

// Creating End Point For Registering the user 

app.post('/signup', async (req, res) => {

    let check = await Users.findOne({ email:req.body.email });
    if (check) {
        return res.status(400).json({ success: false, errors: "Existing User found with Same Email id" });
    }
    let cart = {};
    for (let i = 0; i < 300; i++) {
        cart[i] = 0;
    }
    const user = new Users({
        name: req.body.username,
        email: req.body.email,
        password: req.body.password,
        cartData: cart,
    })
    await user.save();

    //jw 

    const data = {
        user: {
            id: user.id

        }
    }

    // Creating the token 

    const token = jwt.sign(data, 'secret_ecom');
    res.json({ success: true, token });


})

// Creating End point foe user login 

app.post('/login',async (req,res)=>{

    let user = await Users.findOne({email:req.body.email});
    if(user){
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data ={
                user:{
                    id:user.id
                }
            }

            const token = jwt.sign(data,'secret_ecom');
                res.json({success:true,token});
            
        }
        else{
            res.json({success:false,errors:'Wrong Password'})
        }
    }
    else{
        res.json({success:false,errors:"Wrong Emailid"})
    }
})


//creatingend point for newcollection data

app.get('/newcollections',async (req,res)=>{
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("NewCollection Fetched");
    res.send(newcollection);

})

//creating endpoint for popular in women section 

app.get('/popularinwomen',async (req,res)=>{
    let  products = await Product.find({category:'women'});
    let popular_in_women = products.slice(0,4);

    console.log("Popular in women fetched");
    res.send(popular_in_women);
})

//creating middelware to fetch user 

const fetchUser = async (req,res,next) => {
     const token = req.header('auth-token');
     if (!token) {
        res.status(401).send({errors:"Please authenticate using valid function"})
     }
     else{
        try {
            const data = jwt.verify(token,'secret_ecom');
            req.user =data.user;
            next();
        } catch (error) {
            res.status(401).send({errors:"please authenticate using a valid token"})
        }
     }
}


//creating the endpoint for adding products in cart data 

app.post('/addtocart', fetchUser, async (req, res) => {
    try {
        let userData = await Users.findOne({ _id: req.user.id });
        if (!userData) {
            return res.status(404).send("User not found");
        }

        // Initialize cartData if it doesn't exist
        userData.cartData = userData.cartData || {};
        
        const itemId = req.body.itemId;
        userData.cartData[itemId] = (userData.cartData[itemId] || 0) + 1;

        await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });

        res.send("Added");
    } catch (error) {
        console.error("Error adding product to cart:", error);
        res.status(500).send("An unexpected error occurred");
    }
});

//crrating endpoint to remove product from cartdata 
app.post('/removefromcart', fetchUser, async (req, res) => {
    try {
        const userData = await Users.findOne({ _id: req.user.id });
        if (!userData) {
            return res.status(404).send({ errors: "User not found" });
        }

        // Check if the product exists in the cart data
        const itemId = req.body.itemId;
        if (!userData.cartData.hasOwnProperty(itemId) || userData.cartData[itemId] === 0) {
            return res.status(400).send({ errors: "Product not found in cart" });
        }

        // Reduce the quantity of the product in the cart data
        userData.cartData[itemId] -= 1;

        // Update the cart data in the database
        await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });

        res.send("Removed");
    } catch (error) {
        console.error("Error removing product from cart:", error);
        res.status(500).send({ errors: "An unexpected error occurred" });
    }
});


app.get('/getcart', fetchUser, async (req, res) => {
    try {
        const userData = await Users.findOne({ _id: req.user.id });
        if (!userData) {
            return res.status(404).json({ errors: "User not found" });
        }

        res.json(userData.cartData);
    } catch (error) {
        console.error("Error fetching cart data:", error);
        res.status(500).json({ errors: "An unexpected error occurred" });
    }
});

// // Function to fetch user data from the backend
// const fetchUserData = async () => {
//     try {
//         // Fetch user data from the backend
//         const response = await fetch('http://localhost:4000/user', {
//             method: 'GET',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'auth-token': localStorage.getItem('auth-token') // Send the authentication token with the request
//             }
//         });

//         const data = await response.json();
//         // Check if the request was successful
//         if (response.ok) {
//             // Store the email in localStorage
//             localStorage.setItem('email', data.email);
//         } else {
//             console.error('Failed to fetch user data:', data.errors);
//         }
//     } catch (error) {
//         console.error('Error:', error);
//     }
// };



app.listen(port, (error) => {
    if (!error) {
        console.log("Server Running on Port" + port)
    }
    else {
        console.log("Error:" + error)
    }
})