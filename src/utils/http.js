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

    switch (resp.data.code) {
        case 401:
            Message.error('登录凭证已过期，请重新登录, 3秒后跳转到登录页');
            setTimeout(() => {
                localStorage.removeItem('sign');
                localStorage.removeItem('username');
                localStorage.removeItem('uid');
                window.location.href = '/login';
            }, 3000);
            break;
        case 403:
            Message.error('您没有权限访问该资源');
            break;
        case 500:
            Message.error('服务器内部错误，请稍后再试');
            break;
        case 502:
            Message.error('网关错误，请稍后再试');
            break;           
    }
    
    return Promise.resolve(resp) 
}, err => {
    console.log(err);

    return Promise.reject(err)
});


export const get = (url, params) => {
    return new Promise((resolve, reject) => {
        instance.get(url, {
            params
        }).then(resp => {
            resolve(resp);
        }).catch(error => {
            // Message.error(error+":无法连接服务器");
            return new Promise(() => {});
        })
    })
};
  
export const post = (url, data) => {
    return new Promise((resolve, reject) => {
        instance.post(url, data).then(resp => {
            resolve(resp);
        }).catch(error => {
            // Message.error(error+":无法连接服务器");
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
            // Message.error(error+":无法连接服务器");
            // reject(error);
            return new Promise(() => {});
        })
    })
};
