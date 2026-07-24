import axios from 'axios'
import baseUrl from './baseUrl'
import { Message } from 'element-ui'


// 创建axios实例
const instance = axios.create({
    baseURL: baseUrl,
    timeout: 58000,
//   responseType: 'json',
});

instance.interceptors.request.use(config => {
    // 请求拦截逻辑写在这里
    return Promise.resolve(config)
}, error => {
    return Promise.reject(error)
});

// var p1 = ()=> new Promise((resolve, reject) => setTimeout(()=>resolve(11122), 1000))
// 定义了一个p1无参函数, 返回值是promise对象
// 直接new Promise里边的函数会立即执行，所以需要调用时候才执行，只能把new Promise当做函数返回值

instance.interceptors.response.use(resp => {
    // 响应拦截逻辑写在这里
    return Promise.resolve(resp) // 异步调用方式将回调函数作为函数参数返回
}, err => {
    switch (err.response.status) {
        case 400:
            Message.error(err.response.data.message);
            return new Promise(() => {});
        case 403:
            Message.error(err.response.data.message);
            return new Promise(() => {});
        case 500:
            Message.error(err);
            return new Promise(() => {});
        case 502:
            Message.error(err.response.data.message+" 3秒后将跳转到登录页!");
            setTimeout(()=>{
                sessionStorage.clear();
                window.location.href = '/';
                ;},3000)
            return new Promise(() => {});
    }
    return Promise.reject(err)
});


export const get = (url, params) => {
    return new Promise((resolve, reject) => {
        instance.get(url, {
            params
        }).then(resp => {
            resolve(resp);
        }).catch(error => {
            Message.error(error+":无法连接服务器");
            return new Promise(() => {});
        })
    })
};
  
export const post = (url, data) => {
    return new Promise((resolve, reject) => {
        instance.post(url, data).then(resp => {
            resolve(resp);
        }).catch(error => {
            Message.error(error+":无法连接服务器");
            // reject(error);
            return new Promise(() => {});
        })
    })
};

export const loginPost = (url, data, other) => {
    return new Promise((resolve, reject) => {
        instance.post(url + "?user="+other, data).then(resp => {
            resolve(resp);
        }).catch(error => {
            Message.error(error+":无法连接服务器");
            // reject(error);
            return new Promise(() => {});
        })
    })
};
