let simpleValidator={}
simpleValidator.init=function(form){
    console.log("simplevalidator.init")
    this.form=document.getElementById(form)
    simpleValidator.resetFields()
}
simpleValidator.resetFields=function(){
    console.log("simplevalidator.resetFields")
    inputs=this.form.querySelectorAll("input")
    for (var j=0; j< inputs.length;j++){
        if (inputs[j].hasAttribute("required") && inputs[j].value.length==0){
            inputs[j].classList.remove("is-danger")
            parentNode=inputs[j].closest(".field")
            help=parentNode.querySelector(".help")
            if (help){
                help.classList.add("is-hidden")
            }
        }
        if (inputs[j].getAttribute("type")=="text" || inputs[j].getAttribute("type")=="" || inputs[j].getAttribute("type")=="email" || inputs[j].getAttribute("type")=="phone" || inputs[j].getAttribute("type")=="password"){
            inputs[j].addEventListener("keyup", simpleValidator.onKeyUp, false);
        }
        if (inputs[j].getAttribute("type")=="checkbox"){
            inputs[j].addEventListener("click", simpleValidator.onKeyUp, false);
        }
    }
}
simpleValidator.onKeyUp=function(event){
    if (event.key == "Enter") {
        return
    }
    console.log("key up")
    this.classList.remove("is-danger")
    parentNode=this.closest(".field")
    help=parentNode.querySelector(".help")
    if (help){
        help.classList.add("is-hidden")
    }
}
simpleValidator.checkRequired=function(){
    console.log("simplevalidator.checkRequired")
    isValid=true
    
    inputs=this.form.querySelectorAll("input")
    for (var j=0; j< inputs.length;j++){
        var inputValid=true
        if (inputs[j].hasAttribute("required")){
            
            if (inputs[j].getAttribute("type")=="text" || inputs[j].getAttribute("type")=="" || inputs[j].getAttribute("type")=="email" || inputs[j].getAttribute("type")=="phone" || inputs[j].getAttribute("type")=="password"){
                if (inputs[j].value.length==0){
                    isValid=false
                    inputValid=false
                }
            }
            if (inputs[j].getAttribute("type")=="checkbox" && !inputs[j].checked){
                isValid=false
                inputValid=false
            }
        }
        if (!inputValid){
            inputs[j].classList.add("is-danger")
            field=inputs[j].closest(".field")
            help=field.querySelector(".help")
            if (help){
                help.classList.add("is-danger")
                help.classList.remove("is-hidden")
            }
        }
    }
    
    return isValid
    
}
simpleValidator.checkRequiredOLD=function(){
    isValid=true
    fields=this.form.querySelectorAll(".field")
    for(var i=0; i < fields.length;i++){
        inputs=fields[i].querySelectorAll("input")
        for (var j=0; j< inputs.length;j++){
            if (inputs[j].hasAttribute("required")){

                if (inputs[j].getAttribute("type")=="text" || inputs[j].getAttribute("type")=="" || inputs[j].getAttribute("type")=="email" || inputs[j].getAttribute("type")=="phone" || inputs[j].getAttribute("type")=="password"){
                    if (inputs[j].value.length==0){
                        isValid=false
                    }
                }
                if (inputs[j].getAttribute("type")=="checkbox" && !inputs[j].checked){
                    isValid=false
                }
            }
            if (!isValid){
                inputs[j].classList.add("is-danger")
                help=fields[i].querySelector(".help")
                if (help){
                    help.classList.add("is-danger")
                    help.classList.remove("is-hidden")
                }
            }
        }
    }
    return isValid
    
}