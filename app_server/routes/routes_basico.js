var express = require("express");
var Producto = require("../models/producto").Producto;
var Almacen = require("../models/almacen").Almacen;
var Consumo = require("../models/consumo").Consumo;
var RegistroDeMovimiento = require("../models/registroDeMovimiento").RegistroDeMovimiento;
var Baja = require("../models/baja").Baja;
var Tecnica = require("../models/tecnica").Tecnica;
var Basico = require("../models/basico").Basico;
var router = express.Router();

// gelishtime/basicos
router.route("/")
      .get(function(req,res){
        // busco las tecnicas de la sucursal del usuario
        Tecnica.find({sucursal:res.locals.usuario.sucursal},{nombreCompleto:1}).exec(function(err,tecnicas){
          if(!err && tecnicas){ // si no hubo error y existen tecnicas
            // busca los productos basicos
            Producto.find({esBasico:true},{nombre:1}).exec(function(err,productos){
              if(!err && productos){ // si no hubo error y existen productos
                res.render("./basicos/manager",{tecnicas:tecnicas,productos:productos,Asignado:false,AlertAsignado:false,Baja:false,Alertbaja:false,AlertYaAsignado:false,AlertNoAsignado:false});
              }else{ // si hubo un error
                if(err) console.log(err); // imprime el error
                res.redirect("/producto/new");
              }
            });
          }else{ // si paso algun error
            if(err) console.log(err); // imprime el error si hubo
            res.redirect("/tecnicas/new");
          }
        });
      })
      .put(function(req,res){
        // pasar a consumo un producto basico
        // busco el producto a asignar
        Producto.findOne({nombre:req.body.producto},{_id:1}).exec(function(err,producto){
          if(!err && producto){ // si no hubo error y el producto existe
            // verifico si almenos hay un producto en el almacen
            Almacen.findOne({producto:producto._id,sucursal:res.locals.usuario.sucursal}).exec(function(err,productoAlm){
              if(!err && productoAlm){ // si no hubo error y el producto existe
                if(productoAlm.cantidad > 0){ // si hay mas de un producto en el almacen
                  // busco a la tecnica para asignarle el producto
                  Tecnica.findOne({nombreCompleto:req.body.tecnica},{_id:1}).exec(function(err,tecnica){
                    if(!err && tecnica){ // si no hubo error y la tecnica existe
                      // verifico que no tenga asignado el producto
                      Basico.findOne({sucursal:res.locals.usuario.sucursal,tecnica:tecnica._id,producto:producto._id}).exec(function(err,productoBasico){
                        if(!err && productoBasico){// si no hay error, y existe el producto basico en la tecnica
                          if(productoBasico.enUso){ // si esta en uso, mando una alerta que ya tiene asignado el producto
                            // busco las tecnicas de la sucursal del usuario
                            Tecnica.find({sucursal:res.locals.usuario.sucursal},{nombreCompleto:1}).exec(function(err,tecnicas){
                              if(!err && tecnicas){ // si no hubo error y existen tecnicas
                                // busca los productos basicos de la sucursal
                                Producto.find({esBasico:true},{nombre:1}).exec(function(err,productos){
                                  if(!err && productos){ // si no hubo error y existen productos
                                    res.render("./basicos/manager",{tecnicas:tecnicas,productos:productos,Asignado:false,AlertAsignado:false,Baja:false,Alertbaja:false,AlertYaAsignado:true,AlertNoAsignado:false});
                                  }else{ // si hubo un error
                                    if(err) console.log(err); // imprime el error
                                    res.redirect("/producto/new");
                                  }
                                });
                              }else{ // si paso algun error
                                if(err) console.log(err); // imprime el error si hubo
                                res.redirect("/tecnicas/new");
                              }
                            });

                          }else{ // si no tiene asignado el producto, entonces se le asigna el producto
                            // asigno el producto a la tecnicas
                            res.locals.productoBasicoUpdate = productoBasico;
                            res.locals.productoBasicoUpdate.enUso = true;
                            res.locals.productoBasicoUpdate.save(function(err){
                              if(err) console.log(err);
                            });
                            // le resto un producto al almacen
                            res.locals.productoAlmUpdate = productoAlm;
                            res.locals.productoAlmUpdate.cantidad -= 1; // se le resta 1
                            res.locals.productoAlmUpdate.save(function(err){
                              if(err) console.log(err);
                            });
                            //--------------------------------
                            // le sumo uno al consumo del producto
                            Consumo.findOne({producto:producto._id,sucursal:res.locals.usuario.sucursal}).exec(function(err,productoCon){
                              if(!err && productoCon){ // si no hubo error y hay consumo del producto
                                res.locals.productoConUpdate = productoCon;
                                res.locals.productoConUpdate.cantidad += 1; // se le suma 1
                                res.locals.productoConUpdate.save(function(err){
                                  if(err) console.log(err);
                                });
                              }else{ // si paso algo
                                if(!productoCon){ // si no hay consumo del producto
                                  // creo el consumo del producto
                                  var consumo = new Consumo({
                                    sucursal:res.locals.usuario.sucursal,
                                    cantidad:1,
                                    producto:producto._id
                                  });
                                  consumo.save().then(function(us){
                                  }, function(err){ // si ocurre un error lo imprime
                                    console.log(err);
                                  });

                                }else{ // si paso un error
                                  console.log(err);
                                  res.redirect("/almacen");
                                }
                              }
                            });
                            //------------------------------------
                            // creo un registro del movimiento
                            // genera el registro
                            // creo la fecha
                            var fecha = new Date();
                            fecha.setHours(fecha.getHours()-7);
                            var registro = new RegistroDeMovimiento({
                              sucursal:res.locals.usuario.sucursal,
                              usuario:req.session.user_id,
                              cantidad:1,
                              producto:producto._id,
                              tipo: 0,
                              tecnica:tecnica._id,
                              fecha:fecha
                            });
                            fecha=null;
                            // guarda el registro
                            registro.save().then(function(us){
                              // busco las tecnicas de la sucursal del usuario
                              Tecnica.find({sucursal:res.locals.usuario.sucursal},{nombreCompleto:1}).exec(function(err,tecnicas){
                                if(!err && tecnicas){ // si no hubo error y existen tecnicas
                                  // busca los productos basicos de la sucursal
                                  Producto.find({esBasico:true},{nombre:1}).exec(function(err,productos){
                                    if(!err && productos){ // si no hubo error y existen productos
                                      res.render("./basicos/manager",{tecnicas:tecnicas,productos:productos,Asignado:true,AlertAsignado:false,Baja:false,Alertbaja:false,AlertYaAsignado:false,AlertNoAsignado:false});
                                    }else{ // si hubo un error
                                      if(err) console.log(err); // imprime el error
                                      res.redirect("/producto/new");
                                    }
                                  });
                                }else{ // si paso algun error
                                  if(err) console.log(err); // imprime el error si hubo
                                  res.redirect("/tecnicas/new");
                                }
                              });

                            }, function(err){ // si ocurre un error lo imprime
                              console.log(err);
                            });
                            //--------------------------------
                          }

                        }else{ // si paso algo
                          if(!productoBasico){ // si no existe el producto basico en la tecnica
                            // creo el registro del basico para la tecnica
                            var basico = new Basico({
                              sucursal:res.locals.usuario.sucursal,
                              tecnica:tecnica._id,
                              producto:producto._id,
                              enUso:true
                            });
                            // guarda el registro del basico
                            basico.save().then(function(us){
                            }, function(err){ // si ocurre un error lo imprime
                              console.log(err);
                            });
                            //---------------------------------------------
                            // le resto un producto al almacen
                            res.locals.productoAlmUpdate = productoAlm;
                            res.locals.productoAlmUpdate.cantidad -= 1; // se le resta 1
                            res.locals.productoAlmUpdate.save(function(err){
                              if(err) console.log(err);
                            });
                            //--------------------------------
                            // le sumo uno al consumo del producto
                            Consumo.findOne({producto:producto._id,sucursal:res.locals.usuario.sucursal}).exec(function(err,productoCon){
                              if(!err && productoCon){ // si no hubo error y hay consumo del producto
                                res.locals.productoConUpdate = productoCon;
                                res.locals.productoConUpdate.cantidad += 1; // se le suma 1
                                res.locals.productoConUpdate.save(function(err){
                                  if(err) console.log(err);
                                });
                              }else{ // si paso algo
                                if(!productoCon){ // si no hay consumo del producto
                                  // creo el consumo del producto
                                  var consumo = new Consumo({
                                    sucursal:res.locals.usuario.sucursal,
                                    cantidad:1,
                                    producto:producto._id
                                  });
                                  consumo.save().then(function(us){
                                  }, function(err){ // si ocurre un error lo imprime
                                    console.log(err);
                                  });

                                }else{ // si paso un error
                                  console.log(err);
                                  res.redirect("/almacen");
                                }
                              }
                            });
                            //------------------------------------
                            // creo un registro del movimiento
                            // creo la fecha
                            var fecha = new Date();
                            fecha.setHours(fecha.getHours()-7);
                            // genera el registro
                            var registro = new RegistroDeMovimiento({
                              sucursal:res.locals.usuario.sucursal,
                              usuario:req.session.user_id,
                              cantidad:1,
                              producto:producto._id,
                              tipo: 0,
                              tecnica:tecnica._id,
                              fecha:fecha
                            });
                            fecha=null;
                            // guarda el registro
                            registro.save().then(function(us){
                              // busco las tecnicas de la sucursal del usuario
                              Tecnica.find({sucursal:res.locals.usuario.sucursal},{nombreCompleto:1}).exec(function(err,tecnicas){
                                if(!err && tecnicas){ // si no hubo error y existen tecnicas
                                  // busca los productos basicos de la sucursal
                                  Producto.find({esBasico:true},{nombre:1}).exec(function(err,productos){
                                    if(!err && productos){ // si no hubo error y existen productos
                                      res.render("./basicos/manager",{tecnicas:tecnicas,productos:productos,Asignado:true,AlertAsignado:false,Baja:false,Alertbaja:false,AlertYaAsignado:false,AlertNoAsignado:false});
                                    }else{ // si hubo un error
                                      if(err) console.log(err); // imprime el error
                                      res.redirect("/producto/new");
                                    }
                                  });
                                }else{ // si paso algun error
                                  if(err) console.log(err); // imprime el error si hubo
                                  res.redirect("/tecnicas/new");
                                }
                              });

                            }, function(err){ // si ocurre un error lo imprime
                              console.log(err);
                            });
                          }else{ // si hubo un error
                            console.log(err);
                            res.redirect("/almacen");
                          }
                        }
                      });

                    }else{ // si hubo un error
                      if(err) console.log(err);
                      res.redirect("/tecnicas/new");
                    }
                  });
                }else{ // si no hay producto en el almacen
                  // busco las tecnicas de la sucursal del usuario
                  Tecnica.find({sucursal:res.locals.usuario.sucursal},{nombreCompleto:1}).exec(function(err,tecnicas){
                    if(!err && tecnicas){ // si no hubo error y existen tecnicas
                      // busca los productos basicos de la sucursal
                      Producto.find({esBasico:true},{nombre:1}).exec(function(err,productos){
                        if(!err && productos){ // si no hubo error y existen productos
                          res.render("./basicos/manager",{tecnicas:tecnicas,productos:productos,Asignado:false,AlertAsignado:true,Baja:false,Alertbaja:false,AlertYaAsignado:false,AlertNoAsignado:false});
                        }else{ // si hubo un error
                          if(err) console.log(err); // imprime el error
                          res.redirect("/producto/new");
                        }
                      });
                    }else{ // si paso algun error
                      if(err) console.log(err); // imprime el error si hubo
                      res.redirect("/tecnicas/new");
                    }
                  });

                }
              }else{ // si hubo error o el producto no existe
                if(!productoAlm){ // si no hay producto mando alerta
                  // busco las tecnicas de la sucursal del usuario
                  Tecnica.find({sucursal:res.locals.usuario.sucursal},{nombreCompleto:1}).exec(function(err,tecnicas){
                    if(!err && tecnicas){ // si no hubo error y existen tecnicas
                      // busca los productos basicos de la sucursal
                      Producto.find({esBasico:true},{nombre:1}).exec(function(err,productos){
                        if(!err && productos){ // si no hubo error y existen productos
                          res.render("./basicos/manager",{tecnicas:tecnicas,productos:productos,Asignado:false,AlertAsignado:true,Baja:false,Alertbaja:false,AlertYaAsignado:false,AlertNoAsignado:false});
                        }else{ // si hubo un error
                          if(err) console.log(err); // imprime el error
                          res.redirect("/producto/new");
                        }
                      });
                    }else{ // si paso algun error
                      if(err) console.log(err); // imprime el error si hubo
                      res.redirect("/tecnicas/new");
                    }
                  });
                }else{
                  console.log(err);
                  res.redirect("/products/new");
                }
              }
            });

          }else{ // si hubo error
            if(err) console.log(err);
            res.redirect("/products/new");
          }
        });

      })
      // Metodo DELETE
      .delete(function(req,res){
        // dar de baja un producto basico
        // busco el producto a quitar
        Producto.findOne({nombre:req.body.producto},{_id:1}).exec(function(err,producto){
          if(!err && producto){ // si no hubo error y el producto existe
            // verifico si almenos hay un producto en consumo
            Consumo.findOne({producto:producto._id,sucursal:res.locals.usuario.sucursal}).exec(function(err,productoCon){
              if(!err && productoCon){ // si no hubo error y el producto existe
                if(productoCon.cantidad > 0){ // si hay mas de un producto en consumo
                  // busco a la tecnica para asignarle la baja
                  Tecnica.findOne({nombreCompleto:req.body.tecnica},{_id:1}).exec(function(err,tecnica){
                    if(!err && tecnica){ // si no hubo error y la tecnica existe
                      // busco en los basicos
                      Basico.findOne({sucursal:res.locals.usuario.sucursal,tecnica:tecnica._id,producto:producto._id}).exec(function(err,productoBasico){
                        if(!err && productoBasico){ // si no hay error y existe el registro del producto
                          if(productoBasico.enUso){ // si esta en uso, entonces hace la baja
                            // pone que no esta en uso ese producto
                            res.locals.productoBasicoUpdate = productoBasico;
                            res.locals.productoBasicoUpdate.enUso = false; // se le resta 1
                            res.locals.productoBasicoUpdate.save(function(err){
                              if(err) console.log(err);
                            });
                            // le resto un producto al consumo
                            res.locals.productoConUpdate = productoCon;
                            res.locals.productoConUpdate.cantidad -= 1; // se le resta 1
                            res.locals.productoConUpdate.save(function(err){
                              if(err) console.log(err);
                            });
                            //--------------------------------
                            // realizo la baja del producto
                            // creo la fecha
                            var fecha = new Date();
                            fecha.setHours(fecha.getHours()-7);
                            var baja = new Baja({
                              sucursal:res.locals.usuario.sucursal,
                              usuario:req.session.user_id,
                              cantidad:1,
                              producto:producto._id,
                              tecnica:tecnica._id,
                              fecha:fecha
                            });
                            fecha=null;
                            // guarda la baja
                            baja.save().then(function(us){
                              // busco las tecnicas de la sucursal del usuario
                              Tecnica.find({sucursal:res.locals.usuario.sucursal},{nombreCompleto:1}).exec(function(err,tecnicas){
                                if(!err && tecnicas){ // si no hubo error y existen tecnicas
                                  // busca los productos basicos de la sucursal
                                  Producto.find({esBasico:true},{nombre:1}).exec(function(err,productos){
                                    if(!err && productos){ // si no hubo error y existen productos
                                      res.render("./basicos/manager",{tecnicas:tecnicas,productos:productos,Asignado:false,AlertAsignado:false,Baja:true,Alertbaja:false,AlertYaAsignado:false,AlertNoAsignado:false});
                                    }else{ // si hubo un error
                                      if(err) console.log(err); // imprime el error
                                      res.redirect("/producto/new");
                                    }
                                  });
                                }else{ // si paso algun error
                                  if(err) console.log(err); // imprime el error si hubo
                                  res.redirect("/tecnicas/new");
                                }
                              });

                            }, function(err){ // si ocurre un error lo imprime
                              console.log(err);
                            });
                            //-----------------------------
                          }else{ // si no esta en uso, alerta que no puede dar de baja
                            // busco las tecnicas de la sucursal del usuario
                            Tecnica.find({sucursal:res.locals.usuario.sucursal},{nombreCompleto:1}).exec(function(err,tecnicas){
                              if(!err && tecnicas){ // si no hubo error y existen tecnicas
                                // busca los productos basicos de la sucursal
                                Producto.find({esBasico:true},{nombre:1}).exec(function(err,productos){
                                  if(!err && productos){ // si no hubo error y existen productos
                                    res.render("./basicos/manager",{tecnicas:tecnicas,productos:productos,Asignado:false,AlertAsignado:false,Baja:false,Alertbaja:false,AlertYaAsignado:false,AlertNoAsignado:true});
                                  }else{ // si hubo un error
                                    if(err) console.log(err); // imprime el error
                                    res.redirect("/producto/new");
                                  }
                                });
                              }else{ // si paso algun error
                                if(err) console.log(err); // imprime el error si hubo
                                res.redirect("/tecnicas/new");
                              }
                            });
                          }

                        }else{ // si paso algo
                          if(!productoBasico){ // si no hay registro del producto
                            // busco las tecnicas de la sucursal del usuario
                            Tecnica.find({sucursal:res.locals.usuario.sucursal},{nombreCompleto:1}).exec(function(err,tecnicas){
                              if(!err && tecnicas){ // si no hubo error y existen tecnicas
                                // busca los productos basicos de la sucursal
                                Producto.find({esBasico:true},{nombre:1}).exec(function(err,productos){
                                  if(!err && productos){ // si no hubo error y existen productos
                                    res.render("./basicos/manager",{tecnicas:tecnicas,productos:productos,Asignado:false,AlertAsignado:false,Baja:false,Alertbaja:false,AlertYaAsignado:false,AlertNoAsignado:true});
                                  }else{ // si hubo un error
                                    if(err) console.log(err); // imprime el error
                                    res.redirect("/producto/new");
                                  }
                                });
                              }else{ // si paso algun error
                                if(err) console.log(err); // imprime el error si hubo
                                res.redirect("/tecnicas/new");
                              }
                            });
                          }else{ // si hubo error
                            console.log(err);
                            res.redirect("/basicos")
                          }
                        }
                      });

                    }else{ // si hubo un error
                      if(err) console.log(err);
                      res.redirect("/tecnicas/new");
                    }
                  });
                }else{ // si no hay producto en consumo
                  // busco las tecnicas de la sucursal del usuario
                  Tecnica.find({sucursal:res.locals.usuario.sucursal},{nombreCompleto:1}).exec(function(err,tecnicas){
                    if(!err && tecnicas){ // si no hubo error y existen tecnicas
                      // busca los productos basicos de la sucursal
                      Producto.find({esBasico:true},{nombre:1}).exec(function(err,productos){
                        if(!err && productos){ // si no hubo error y existen productos
                          res.render("./basicos/manager",{tecnicas:tecnicas,productos:productos,Asignado:false,AlertAsignado:false,Baja:false,Alertbaja:true,AlertYaAsignado:false,AlertNoAsignado:false});
                        }else{ // si hubo un error
                          if(err) console.log(err); // imprime el error
                          res.redirect("/producto/new");
                        }
                      });
                    }else{ // si paso algun error
                      if(err) console.log(err); // imprime el error si hubo
                      res.redirect("/tecnicas/new");
                    }
                  });

                }
              }else{ // si hubo error o el producto no existe
                if(err) console.log(err);
                res.redirect("/basicos");
              }
            });

          }else{ // si hubo error
            if(err) console.log(err);
            res.redirect("/products/new");
          }
        });
  });

module.exports = router;
