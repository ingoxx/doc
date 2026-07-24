<template>
    <div class="box">
        <el-dialog
            :title="title"
            :visible.sync="visible"
            :close-on-click-modal="true"
            :close-on-press-escape="true"
            :show-close="true"
            :center="true"
            @close="handleClose"
            >
            <div class="key">
                <span>{{content}}</span>
            </div>
            <span slot="footer" class="dialog-footer">
                <el-button @click="visible = false">取 消</el-button>
                <el-button  size="small" type="primary" icon="el-icon-money">确 定</el-button>
            </span>
        </el-dialog>
    </div>
</template>

<script>
    export default {
        name: "cusDia",
        props: {
            title: {
                type: String,
                required: true,
            },
            content: {
                type: String,
                required: true,
            },
            visible: {
                type: Boolean,
                required: true,
                default: false,
            },
            showClose: {
                type: Boolean,
                default: true,
            }
        },
        methods: {
            handleClose() {
                this.$emit('update:visible', false)
            }
        }
    } 
</script>

<style scoped lang="scss">

</style>