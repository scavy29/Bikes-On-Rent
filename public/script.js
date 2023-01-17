$(document).ready(function(){
    var socket=io();
    //connect client to server
    socket.on('connect',function(socket){
        console.log('Connected to Server');
    });
    // emit user id
    var ObjectID=$('#ObjectID').val();
    socket.emit('ObjectID',ObjectID);
    // listen to bike event
    socket.on('bike',function(bike){
        console.log(bike);
        // make an ajax request to fetch longitude and latitude
        $.ajax({
            url:`https://maps.googleapis.com/maps/api/geocode/json?address=${bike.location}&key=AIzaSyDjihRR-gI1CxOVqbEF8aULnfv7QVsguZ4`,
            type:'POST',
            data:JSON,
            processData:true,
            success:function(data){
                console.log(data);
                // send lat & lng
                socket.emit('LatLng',{
                    data:data,
                    bike:bike
                });
            }
        });
    });
    //Disconnect from server
    socket.on('disconnect',function(socket){
        console.log('Disconnected(Server)');
    });
});