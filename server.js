const express = require('express');
const path = require('path');
const hbs = require('express-handlebars');
const bodyparser = require('body-parser');
const mysql = require('mysql');
const upload = require('express-fileupload');
const session = require('express-session');
const { validationResult } = require('express-validator');

const app = express();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.engine(
  'hbs',
  hbs({
    extname: 'hbs',
    defaultlayout: 'main',
    layoutsDir: __dirname + '/views/layouts/',
  })
);

app.use(bodyparser.json());
app.use(
  bodyparser.urlencoded({
    extended: true,
  })
);

app.use(function (req, res, next) {
  res.set(
    'Cache-Control',
    'no-cache,private,no-store,must-revalidate,max-state=0,post-check=0,pre-check=0'
  );
  next();
});

app.use(session({ secret: 'asasasasas' }));

var con = mysql.createConnection({
  user: 'root',
  password: 'root',
  port: 3307,
  host: 'localhost',
  database: 'newsapp',
});

app.use(upload());
app.use(express.static('upload'));

app.get('/', (req, res) => {
  res.render('loginpage');
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.render('loginpage', { msg: 'Logout successfully' });
});

app.get('/loginpage', (req, res) => {
  res.render('loginpage');
});

app.post('/register', (req, res) => {
  var name = req.body.uname;
  var email = req.body.em;
  var password = req.body.newpass;
  var sql = 'insert into user(name,email,password) values(?,?,?);';
  var values = [name, email, password];
  sql = mysql.format(sql, values);
  con.query(sql, (err, result) => {
    if (err) throw err;
    else res.render('loginpage', { msg: 'Account Created' });
  });
});

app.post('/userlogin', (req, res) => {
  var email = req.body.usid;
  var pass = req.body.pass;
  var sql = 'select * from user where email=? and password=?;';
  var values = [email, pass];
  sql = mysql.format(sql, values);
  con.query(sql, (err, result) => {
    if (err) throw err;
    else if (result.length > 0) {
      req.session.user = result[0].userId;
      var uname = result[0].name;
      req.session.name = uname;
      res.render('userhome', { uid: req.session.user, name: uname });
      //   console.log(result);
    } else {
      res.render('loginpage', { msg: 'login fail, try again...!!!' });
    }
  });
});

app.get('/userhome', (req, res) => {
  res.render('userhome', { uid: req.session.user, name: req.session.name });
});

app.post('/addnews', (req, res) => {
  if (req.files) {
    var titl = req.body.ntitle;
    var desc = req.body.descrip;
    var img = req.files.imgbutton;
    var userid = req.session.user;
    var imgname = img.name;
    var newimgname = Math.floor(Math.random() * 1000000) + imgname;
    img.mv('./upload/' + newimgname, (err, result) => {
      if (err) throw err;
      else {
        var sql =
          'insert into post(imageName,userId,title,description) values(?,?,?,?);';
        var values = [newimgname, userid, titl, desc];
        sql = mysql.format(sql, values);
        con.query(sql, (err, result) => {
          if (err) throw err;
          else
            res.render('userhome', {
              msg: 'News Posted',
              uid: req.session.user,
              name: req.session.name,
            });
        });
      }
    });
  }
});

app.get('/myposts', (req, res) => {
  var id = req.session.user;
  var sql = 'select * from post where userId=?;';
  var values = [id];
  sql = mysql.format(sql, values);
  con.query(sql, (err, result) => {
    if (err) throw err;
    else {
      res.render('myposts', {
        uid: req.session.user,
        name: req.session.name,
        data: result,
      });
      //   console.log(result);
    }
  });
});

app.get('/deletePost', (req, res) => {
  var pid = req.query._id;
  var sql = 'delete from post where postId=?;';
  var values = [pid];
  sql = mysql.format(sql, values);
  con.query(sql, (err, result) => {
    if (err) throw err;
    else {
      var id = req.session.user;
      var inb = 'select * from post where userId=?;';
      var values = [id];
      inb = mysql.format(inb, values);
      con.query(inb, (err, result) => {
        if (err) throw err;
        else {
          res.render('myposts', {
            uid: req.session.user,
            name: req.session.name,
            data: result,
            msg: 'News Deleted...!!!',
          });
        }
      });
    }
  });
});

app.get('/upPost', (req, res) => {
  var pid = req.query._id;
  console.log(pid);
  var sql = 'select * from post where postId=?;';
  var values = [pid];
  sql = mysql.format(sql, values);
  con.query(sql, (err, result) => {
    //    console.log(result);
    if (err) throw err;
    else {
      res.render('updatePost', {
        uid: req.session.user,
        name: req.session.name,
        data: result,
      });
    }
  });
});

app.post('/updatepost', (req, res) => {
  var pId = req.body.posid;
  var titl = req.body.newtitle;
  var desc = req.body.newdescrip;
  var userid = req.session.user;
  if (req.files) {
    var sql = 'select * from post where postId=?;';
    var values = [pId];
    sql = mysql.format(sql, values);
    con.query(sql, (err, result) => {
      if (err) throw err;
      else {
        console.log('-------------------------');
        console.log(result);
        fs.unlink('upload/' + result[0].imageName, (err) => {
          if (err) throw err;
        });
      }
    });
    console.log('if block executed...');
    var file = req.files.newimg;
    var imgname = file.name;
    var newimgname = Math.floor(Math.random() * 1000000) + imgname;
    file.mv('./upload/' + newimgname, (err, result) => {
      if (err) throw err;
      else {
        //update code
        var inb =
          'update post set imageName=?,title=?,description=? where postId=?';
        var val = [newimgname, titl, desc, pId];
        inb = mysql.format(inb, val);
        con.query(inb, (err, result) => {
          if (err) throw err;
          else {
            var sqlone = 'select * from post where userId=?;';
            var valone = [userid];
            sqlone = mysql.format(sqlone, valone);
            con.query(sqlone, (err, result) => {
              if (err) throw err;
              else {
                res.render('myposts', {
                  uid: req.session.user,
                  name: req.session.name,
                  data: result,
                  msg: 'News Updated',
                });
                //   console.log(result);
              }
            });
          }
        });
      }
    });
  } else {
    var sqltwo = 'update post set title=?,description=? where postId=?';
    var valu = [titl, desc, pId];
    sqltwo = mysql.format(sqltwo, valu);
    con.query(sqltwo, (err, result) => {
      if (err) throw err;
      else {
        var sqlthree = 'select * from post where userId=?;';
        var valtwo = [userid];
        sqlthree = mysql.format(sqlthree, valtwo);
        con.query(sqlthree, (err, result) => {
          if (err) throw err;
          else {
            res.render('myposts', {
              uid: req.session.user,
              name: req.session.name,
              data: result,
              msg: 'News Updated',
            });
            //   console.log(result);
          }
        });
      }
    });
  }
});

app.get('/newsfeed', (req, res) => {
  var sql =
    'select user.name, post.title, post.imageName, post.postId from user right join post on user.userId = post.userId;';
  con.query(sql, (err, result) => {
    //    console.log(result);
    if (err) throw err;
    else {
      res.render('newsfeed', {
        uid: req.session.user,
        name: req.session.name,
        data: result,
      });
    }
  });
});

app.get('/viewpost', (req, res) => {
  var posid = req.query.poid;
  var sql = 'select * from post where postId = ?;';
  var values = [posid];
  sql = mysql.format(sql, values);
  con.query(sql, (err, result) => {
    //    console.log(result);
    if (err) throw err;
    else {
      var sqlone = 'select * from commenttable where pid=?;';
      var val = [posid];
      sqlone = mysql.format(sqlone, val);
      con.query(sqlone, (err, resultone) => {
        if (err) throw err;
        else {
          res.render('news', {
            uid: req.session.user,
            name: req.session.name,
            data: result,
            dataone: resultone,
          });
        }
      });
    }
  });
});

app.post('/comment', (req, res) => {
  var pi = req.body.poId;
  console.log(pi);
  var comm = req.body.commentbox;
  var nm = req.session.name;
  var sql = 'insert into commenttable values(?,?,?);';
  var values = [comm, pi, nm];
  sql = mysql.format(sql, values);
  con.query(sql, (err, result) => {
    if (err) throw err;
    else {
      var imb = 'select * from post where postId = ?;';
      var value = [pi];
      imb = mysql.format(imb, value);
      con.query(imb, (err, result) => {
        //    console.log(result);
        if (err) throw err;
        else {
          var sqlone = 'select * from commenttable where pid=?;';
          var val = [pi];
          sqlone = mysql.format(sqlone, val);
          con.query(sqlone, (err, resultone) => {
            if (err) throw err;
            else {
              res.render('news', {
                uid: req.session.user,
                name: req.session.name,
                data: result,
                dataone: resultone,
              });
            }
          });
        }
      });
    }
  });
});
